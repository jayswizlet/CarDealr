"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMakes, getListings } from "@/lib/api";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/Pagination";

const INPUT =
  "bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 w-full placeholder-zinc-500";

export default function SearchPage() {
  const [make, setMake] = useState("");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [maxMileage, setMaxMileage] = useState("");
  const [page, setPage] = useState(1);

  const { data: makes = [] } = useQuery({
    queryKey: ["makes"],
    queryFn: getMakes,
    staleTime: Infinity,
  });

  const filters = {
    ...(make && { make }),
    ...(minYear && { minYear: parseInt(minYear) }),
    ...(maxYear && { maxYear: parseInt(maxYear) }),
    ...(minPrice && { minPrice: parseFloat(minPrice) }),
    ...(maxPrice && { maxPrice: parseFloat(maxPrice) }),
    ...(maxMileage && { maxMileage: parseFloat(maxMileage) }),
    page,
    limit: 12,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["listings", filters],
    queryFn: () => getListings(filters),
    staleTime: 30_000,
  });

  function handleChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Find Your Next Car</h1>

      {/* Filters */}
      <div className="bg-zinc-900 rounded-xl p-4 mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <select value={make} onChange={handleChange(setMake)} className={INPUT}>
          <option value="">All Makes</option>
          {makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min Year"
          value={minYear}
          onChange={handleChange(setMinYear)}
          className={INPUT}
        />
        <input
          type="number"
          placeholder="Max Year"
          value={maxYear}
          onChange={handleChange(setMaxYear)}
          className={INPUT}
        />
        <input
          type="number"
          placeholder="Min Price"
          value={minPrice}
          onChange={handleChange(setMinPrice)}
          className={INPUT}
        />
        <input
          type="number"
          placeholder="Max Price"
          value={maxPrice}
          onChange={handleChange(setMaxPrice)}
          className={INPUT}
        />
        <input
          type="number"
          placeholder="Max Mileage"
          value={maxMileage}
          onChange={handleChange(setMaxMileage)}
          className={INPUT}
        />
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-zinc-800 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <p className="text-red-400 text-center py-16">
          Could not load listings — is the backend running on port 4000?
        </p>
      )}

      {/* Empty */}
      {!isLoading && !isError && data?.data.length === 0 && (
        <p className="text-zinc-500 text-center py-16">No listings match your filters.</p>
      )}

      {/* Results */}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </>
      )}
    </div>
  );
}
