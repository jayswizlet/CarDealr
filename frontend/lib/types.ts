export interface Listing {
  id: number;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  condition: string | null;
  fuelType: string | null;
  transmission: string | null;
  color: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  createdAt: string;
}

export interface Factor {
  name: string;
  score: number;
  max: number;
  note: string;
}

export interface ScoreResponse {
  score: number;
  label: "Great Deal" | "Good Deal" | "Fair" | "Overpriced";
  market_value: number;
  price_delta: number;
  factors: Factor[];
}

export interface PaginatedListings {
  data: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListingFilters {
  make?: string;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  maxMileage?: number;
  page?: number;
  limit?: number;
}
