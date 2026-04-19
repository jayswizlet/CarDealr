import { Router, Request, Response } from "express";
import axios from "axios";
import prisma from "../lib/prisma";

const SCORING_SERVICE_URL = process.env.SCORING_SERVICE_URL || "http://localhost:8000";

const router = Router();

// GET /api/listings
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      make,
      model,
      minYear,
      maxYear,
      minPrice,
      maxPrice,
      maxMileage,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (make) where.make = { equals: make as string, mode: "insensitive" };
    if (model) where.model = { equals: model as string, mode: "insensitive" };
    if (minYear || maxYear) {
      where.year = {
        ...(minYear ? { gte: parseInt(minYear as string) } : {}),
        ...(maxYear ? { lte: parseInt(maxYear as string) } : {}),
      };
    }
    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice ? { gte: parseFloat(minPrice as string) } : {}),
        ...(maxPrice ? { lte: parseFloat(maxPrice as string) } : {}),
      };
    }
    if (maxMileage) {
      where.mileage = { lte: parseFloat(maxMileage as string) };
    }

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      data: listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// GET /api/listings/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// GET /api/listings/:id/comparables
router.get("/:id/comparables", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const comparables = await prisma.listing.findMany({
      where: {
        id: { not: id },
        make: { equals: listing.make, mode: "insensitive" },
        model: { equals: listing.model, mode: "insensitive" },
        year: { gte: listing.year - 2, lte: listing.year + 2 },
        mileage: {
          gte: listing.mileage - 30000,
          lte: listing.mileage + 30000,
        },
      },
      take: 5,
      orderBy: { price: "asc" },
    });

    res.json(comparables);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comparables" });
  }
});

// GET /api/listings/:id/score
router.get("/:id/score", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const { data } = await axios.post(`${SCORING_SERVICE_URL}/score`, {
      price: listing.price,
      make: listing.make,
      model: listing.model,
      year: listing.year,
      mileage: listing.mileage,
    });

    res.json(data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
        return res.status(503).json({ error: "Scoring service is unavailable" });
      }
      if (err.response) {
        return res.status(err.response.status).json(err.response.data);
      }
    }
    res.status(500).json({ error: "Failed to score listing" });
  }
});

export default router;
