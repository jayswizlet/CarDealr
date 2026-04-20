"""
Seed script: downloads austinreese/craigslist-carstrucks-data from Kaggle,
cleans it, and inserts 50,000 rows into the cardealr PostgreSQL database.

Requirements:
  pip install kaggle pandas psycopg2-binary python-dotenv

Kaggle credentials must be set up at ~/.kaggle/kaggle.json
  (https://www.kaggle.com/docs/api#authentication)
"""

import os
import subprocess
import zipfile
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
from dotenv import load_dotenv

# Load DATABASE_URL from backend/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
DATASET = "austinreese/craigslist-carstrucks-data"
DOWNLOAD_DIR = "/tmp/cardealr_kaggle"
TARGET_ROWS = 50_000
BATCH_SIZE = 1_000


def download_dataset():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    print(f"Downloading {DATASET} ...")
    subprocess.run(
        ["kaggle", "datasets", "download", "-d", DATASET, "-p", DOWNLOAD_DIR, "--unzip"],
        check=True,
    )
    print("Download complete.")


def find_csv():
    for fname in os.listdir(DOWNLOAD_DIR):
        if fname.endswith(".csv"):
            path = os.path.join(DOWNLOAD_DIR, fname)
            print(f"Found CSV: {path}")
            return path
    raise FileNotFoundError(f"No CSV found in {DOWNLOAD_DIR}")


def load_and_clean(csv_path: str) -> pd.DataFrame:
    print("Loading CSV ...")
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"Raw rows: {len(df):,}  |  Columns: {list(df.columns)}")

    # Craigslist dataset column mapping → schema field
    col_map = {
        "manufacturer": "make",
        "model": "model",
        "year": "year",
        "price": "price",
        "odometer": "mileage",
        "condition": "condition",
        "fuel": "fuelType",
        "transmission": "transmission",
        "paint_color": "color",
        "region": "city",
        "state": "state",
        "description": "description",
    }

    # Keep only columns we need
    available = {k: v for k, v in col_map.items() if k in df.columns}
    df = df[list(available.keys())].rename(columns=available)

    required = ["make", "model", "year", "price", "mileage"]
    df = df.dropna(subset=required)

    # Coerce numeric columns
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df["mileage"] = pd.to_numeric(df["mileage"], errors="coerce")
    df = df.dropna(subset=["year", "price", "mileage"])

    # Sanity filters — remove junk listings
    df = df[df["price"] > 500]
    df = df[df["price"] < 500_000]
    df = df[df["mileage"] >= 0]
    df = df[df["mileage"] < 1_000_000]
    df = df[df["year"] >= 1980]
    df = df[df["year"] <= 2025]

    df["make"] = df["make"].str.strip().str.title()
    df["model"] = df["model"].str.strip().str.title()
    df["year"] = df["year"].astype(int)
    df["price"] = df["price"].astype(float)
    df["mileage"] = df["mileage"].astype(float)

    # Replace NaN strings with None for psycopg2
    string_cols = ["condition", "fuelType", "transmission", "color", "city", "state", "description"]
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].where(df[col].notna(), None)
        else:
            df[col] = None

    df = df.drop_duplicates()
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)  # shuffle

    if len(df) > TARGET_ROWS:
        df = df.iloc[:TARGET_ROWS]

    print(f"Clean rows to insert: {len(df):,}")
    return df


def insert_rows(df: pd.DataFrame):
    print(f"Connecting to database ...")
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    cur = conn.cursor()

    # Clear existing data for idempotent re-runs
    cur.execute('TRUNCATE TABLE "Listing" RESTART IDENTITY CASCADE;')
    conn.commit()

    records = [
        (
            row.get("make"),
            row.get("model"),
            int(row["year"]),
            float(row["price"]),
            float(row["mileage"]),
            row.get("condition"),
            row.get("fuelType"),
            row.get("transmission"),
            row.get("color"),
            row.get("city"),
            row.get("state"),
            row.get("description"),
        )
        for _, row in df.iterrows()
    ]

    sql = """
        INSERT INTO "Listing"
          (make, model, year, price, mileage, condition, "fuelType", transmission, color, city, state, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    print(f"Inserting {len(records):,} rows in batches of {BATCH_SIZE} ...")
    execute_batch(cur, sql, records, page_size=BATCH_SIZE)
    conn.commit()

    cur.close()
    conn.close()
    print("Done! Database seeded successfully.")


if __name__ == "__main__":
    download_dataset()
    csv_path = find_csv()
    df = load_and_clean(csv_path)
    insert_rows(df)
