import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

// GET /api/makes
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await prisma.listing.findMany({
      select: { make: true },
      distinct: ["make"],
      orderBy: { make: "asc" },
    });

    res.json(result.map((r) => r.make));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch makes" });
  }
});

export default router;
