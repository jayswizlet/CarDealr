import express from "express";
import cors from "cors";
import "dotenv/config";
import listingsRouter from "./routes/listings";
import makesRouter from "./routes/makes";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/listings", listingsRouter);
app.use("/api/makes", makesRouter);

app.listen(PORT, () => {
  console.log(`CarDealr API running on http://localhost:${PORT}`);
});
