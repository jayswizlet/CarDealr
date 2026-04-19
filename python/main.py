"""
FastAPI scoring service for CarDealr.
POST /score — evaluates a car listing against market comps from the cardealr DB.
"""

import os
from contextlib import asynccontextmanager

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "backend", ".env"), override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
REFERENCE_YEAR = 2024
MILES_PER_YEAR = 12_000


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ScoreRequest(BaseModel):
    price: float = Field(..., gt=0)
    make: str
    model: str
    year: int = Field(..., ge=1980, le=2100)
    mileage: float = Field(..., ge=0)


class Factor(BaseModel):
    name: str
    score: float
    max: float
    note: str


class ScoreResponse(BaseModel):
    score: float
    label: str
    market_value: float
    price_delta: float
    factors: list[Factor]


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _get_conn():
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
    return psycopg2.connect(DATABASE_URL)


def _fetch_comps(make: str, model: str, year: int) -> tuple[float | None, float | None, int]:
    """Return (avg_price, avg_mileage, comp_count) — tries tight then loose match."""
    conn = _get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT AVG(price) AS avg_price,
                       AVG(mileage) AS avg_mileage,
                       COUNT(*) AS cnt
                FROM "Listing"
                WHERE LOWER(make) = LOWER(%s)
                  AND LOWER(model) = LOWER(%s)
                  AND year = %s
                """,
                (make, model, year),
            )
            row = cur.fetchone()
            if row and row["cnt"] >= 3:
                return float(row["avg_price"]), float(row["avg_mileage"]), int(row["cnt"])

            # Expand: same make/model, any year
            cur.execute(
                """
                SELECT AVG(price) AS avg_price,
                       AVG(mileage) AS avg_mileage,
                       COUNT(*) AS cnt
                FROM "Listing"
                WHERE LOWER(make) = LOWER(%s)
                  AND LOWER(model) = LOWER(%s)
                """,
                (make, model),
            )
            row = cur.fetchone()
            if row and row["cnt"] >= 3:
                return float(row["avg_price"]), float(row["avg_mileage"]), int(row["cnt"])

            return None, None, 0
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def _price_score(price: float, avg_price: float) -> tuple[float, str]:
    """50 pts max. ±20% maps to full range [0, 50]."""
    delta_pct = (avg_price - price) / avg_price  # positive = below market (good)
    raw = delta_pct / 0.20  # -1 to +1 at ±20%
    raw = max(-1.0, min(1.0, raw))
    score = (raw + 1) / 2 * 50  # map [-1,1] → [0,50]
    if delta_pct > 0.10:
        note = f"{delta_pct*100:.1f}% below market avg"
    elif delta_pct < -0.10:
        note = f"{abs(delta_pct)*100:.1f}% above market avg"
    else:
        note = f"Within {abs(delta_pct)*100:.1f}% of market avg"
    return round(score, 1), note


def _mileage_score(mileage: float, year: int) -> tuple[float, str]:
    """30 pts max. Expected miles = (REFERENCE_YEAR - year) * MILES_PER_YEAR."""
    expected = max((REFERENCE_YEAR - year) * MILES_PER_YEAR, 1)
    ratio = mileage / expected  # 1.0 = exactly expected
    # score = 30 at ratio ≤ 0.5, 0 at ratio ≥ 2.0
    raw = 1.0 - (ratio - 0.5) / 1.5
    raw = max(0.0, min(1.0, raw))
    score = raw * 30
    diff = mileage - expected
    if diff < 0:
        note = f"{abs(diff):,.0f} miles below expected"
    else:
        note = f"{diff:,.0f} miles above expected"
    return round(score, 1), note


def _age_score(year: int) -> tuple[float, str]:
    """20 pts max. Linear from 2000 (0 pts) to 2024 (20 pts)."""
    raw = (year - 2000) / (2024 - 2000)
    raw = max(0.0, min(1.0, raw))
    score = raw * 20
    note = f"{year} model year"
    return round(score, 1), note


def _label(score: float) -> str:
    if score >= 80:
        return "Great Deal"
    if score >= 65:
        return "Good Deal"
    if score >= 45:
        return "Fair"
    return "Overpriced"


# ---------------------------------------------------------------------------
# App & route
# ---------------------------------------------------------------------------

app = FastAPI(title="CarDealr Scoring Service", version="1.0.0")


@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest):
    avg_price, avg_mileage, comp_count = _fetch_comps(req.make, req.model, req.year)

    if avg_price is None:
        raise HTTPException(
            status_code=422,
            detail=f"Not enough comparable listings for {req.year} {req.make} {req.model}",
        )

    ps, p_note = _price_score(req.price, avg_price)
    ms, m_note = _mileage_score(req.mileage, req.year)
    as_, a_note = _age_score(req.year)

    total = round(ps + ms + as_, 1)

    return ScoreResponse(
        score=total,
        label=_label(total),
        market_value=round(avg_price, 2),
        price_delta=round(req.price - avg_price, 2),
        factors=[
            Factor(name="Price vs Market", score=ps, max=50, note=p_note),
            Factor(name="Mileage", score=ms, max=30, note=m_note),
            Factor(name="Age", score=as_, max=20, note=a_note),
        ],
    )
