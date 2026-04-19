-- CreateTable
CREATE TABLE "Listing" (
    "id" SERIAL NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "mileage" DOUBLE PRECISION NOT NULL,
    "condition" TEXT,
    "fuelType" TEXT,
    "transmission" TEXT,
    "color" TEXT,
    "city" TEXT,
    "state" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_make_model_idx" ON "Listing"("make", "model");

-- CreateIndex
CREATE INDEX "Listing_year_idx" ON "Listing"("year");

-- CreateIndex
CREATE INDEX "Listing_price_idx" ON "Listing"("price");

-- CreateIndex
CREATE INDEX "Listing_mileage_idx" ON "Listing"("mileage");
