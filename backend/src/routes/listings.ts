import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

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

    const comparables = await prisma.listing.findMany({
      where: {
        id: { not: id },
        make: { equals: listing.make, mode: "insensitive" },
        model: { equals: listing.model, mode: "insensitive" },
        year: { gte: listing.year - 2, lte: listing.year + 2 },
        mileage: { gte: listing.mileage - 30000, lte: listing.mileage + 30000 },
      },
      select: { price: true },
    });

    if (comparables.length < 3) {
      return res.status(422).json({ error: "Not enough comparable listings" });
    }

    const prices = comparables.map((c) => c.price).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const market_value =
      prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];

    const price_delta = listing.price - market_value;
    const pricePct = (market_value - listing.price) / market_value;
    const priceScore = Math.round(Math.min(40, Math.max(0, ((pricePct + 0.2) / 0.4) * 40)));
    const priceNote =
      pricePct >= 0.1
        ? `${Math.round(pricePct * 100)}% below market`
        : pricePct <= -0.1
        ? `${Math.round(-pricePct * 100)}% above market`
        : "Near market price";

    const currentYear = new Date().getFullYear();
    const expectedMileage = Math.max(12000, (currentYear - listing.year) * 12000);
    const mileageRatio = listing.mileage / expectedMileage;
    const mileageScore = Math.round(Math.min(30, Math.max(0, ((2.0 - mileageRatio) / 1.5) * 30)));
    const mileageNote =
      mileageRatio <= 0.75
        ? "Low mileage for age"
        : mileageRatio >= 1.5
        ? "High mileage for age"
        : "Average mileage for age";

    const age = currentYear - listing.year;
    const yearScore = Math.round(Math.min(20, Math.max(0, ((15 - age) / 15) * 20)));
    const yearNote = age <= 2 ? "Nearly new" : age <= 7 ? "Relatively recent" : age <= 12 ? "Older vehicle" : "High age";

    const conditionMap: Record<string, number> = {
      excellent: 10,
      good: 7,
      fair: 4,
      salvage: 0,
    };
    const conditionKey = (listing.condition ?? "").toLowerCase();
    const conditionScore = conditionMap[conditionKey] ?? 5;
    const conditionNote = listing.condition
      ? `Reported as ${listing.condition}`
      : "Condition not listed";

    const total = priceScore + mileageScore + yearScore + conditionScore;
    const label =
      total >= 75 ? "Great Deal" : total >= 55 ? "Good Deal" : total >= 35 ? "Fair" : "Overpriced";

    res.json({
      score: total,
      label,
      market_value,
      price_delta,
      factors: [
        { name: "Price vs Market", score: priceScore, max: 40, note: priceNote },
        { name: "Mileage", score: mileageScore, max: 30, note: mileageNote },
        { name: "Vehicle Age", score: yearScore, max: 20, note: yearNote },
        { name: "Condition", score: conditionScore, max: 10, note: conditionNote },
      ],
    });
  } catch {
    res.status(500).json({ error: "Failed to score listing" });
  }
});

export default router;
