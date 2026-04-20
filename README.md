# CarDealr

A used car marketplace that scores listings against real market data so you can tell a great deal from an overpriced one at a glance.

Browse thousands of listings, filter by make, model, year, price, and mileage — then get an instant deal score (0–100) backed by comparable sales pulled directly from the database.

---

## Features

- **Search & Filter** — filter by make, model, year range, price range, and mileage with pagination
- **Deal Scoring** — every listing is scored 0–100 and labeled: *Great Deal*, *Good Deal*, *Fair*, or *Overpriced*
- **Comparable Listings** — see 5 similar cars (same make/model, ±2 years, ±30k miles) to benchmark any price
- **Score Breakdown** — understand *why* a car scored the way it did across three factors: price vs. market, mileage, and age

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, TanStack Query |
| Backend | Express.js, TypeScript, Prisma ORM |
| Scoring Service | FastAPI (Python), psycopg2 |
| Database | PostgreSQL 15 |
| Infrastructure | Docker, Docker Compose |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

### Run with Docker (recommended)

```bash
git clone https://github.com/jayswizlet/CarDealr.git
cd CarDealr
cp .env.example .env
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| Scoring Service | http://localhost:8000 |

### Seed the Database

The app needs listing data to work. After the containers are up:

```bash
# Requires a Kaggle account — get your API key at kaggle.com/settings
# Place kaggle.json at ~/.kaggle/kaggle.json, then:

docker exec -it cardealr_python python seed.py
```

This downloads ~50,000 real Craigslist car listings from Kaggle and loads them into Postgres.

---

## API Reference

### Listings

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/listings` | Search listings (supports `make`, `model`, `minYear`, `maxYear`, `minPrice`, `maxPrice`, `maxMileage`, `page`, `limit`) |
| GET | `/api/listings/:id` | Get a single listing |
| GET | `/api/listings/:id/score` | Get deal score with factor breakdown |
| GET | `/api/listings/:id/comparables` | Get 5 comparable listings |

### Makes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/makes` | Get all car makes in the database |

### Scoring Service

| Method | Endpoint | Description |
|---|---|---|
| POST | `/score` | Score a listing given `price`, `make`, `model`, `year`, `mileage` |

#### Score Breakdown

| Factor | Weight | Logic |
|---|---|---|
| Price vs. Market | 50 pts | Compared against average of comparable listings |
| Mileage | 30 pts | Benchmarked against 12,000 miles/year expected |
| Vehicle Age | 20 pts | Linear scale from 2000 (0 pts) to 2024 (20 pts) |

---

## Project Structure

```
CarDealr/
├── frontend/        # Next.js app
├── backend/         # Express API + Prisma
│   └── prisma/      # Schema & migrations
├── python/          # FastAPI scoring service + seed script
├── docker-compose.yml
└── .env.example
```

---

## Environment Variables

Copy `.env.example` to `.env` before running. Defaults work out of the box with Docker.

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=cardealr
NEXT_PUBLIC_API_URL=http://localhost:3001
```
