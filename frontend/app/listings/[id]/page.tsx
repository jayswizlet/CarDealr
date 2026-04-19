"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getListing, getScore, getComparables } from "@/lib/api";
import ScoreBadge from "@/components/ScoreBadge";
import type { Listing } from "@/lib/types";

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtMi(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n)) + " mi";
}

function SmallCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-zinc-800 rounded-lg p-4 hover:bg-zinc-700 transition-colors">
        <p className="text-white text-sm font-medium leading-tight">
          {listing.year} {listing.make} {listing.model}
        </p>
        <div className="flex justify-between mt-2 text-sm">
          <span className="font-semibold">{fmt$(listing.price)}</span>
          <span className="text-zinc-400">{fmtMi(listing.mileage)}</span>
        </div>
      </div>
    </Link>
  );
}

const DETAILS: { label: string; key: keyof Listing; fmt?: (v: unknown) => string }[] = [
  { label: "Year", key: "year" },
  { label: "Make", key: "make" },
  { label: "Model", key: "model" },
  { label: "Mileage", key: "mileage", fmt: (v) => fmtMi(v as number) },
  { label: "Condition", key: "condition" },
  { label: "Fuel Type", key: "fuelType" },
  { label: "Transmission", key: "transmission" },
  { label: "Color", key: "color" },
  { label: "Location", key: "city" },
];

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListing(id),
  });

  const { data: score, isLoading: scoreLoading } = useQuery({
    queryKey: ["score", id],
    queryFn: () => getScore(id),
    enabled: !!listing,
    retry: false,
  });

  const { data: comparables = [] } = useQuery({
    queryKey: ["comparables", id],
    queryFn: () => getComparables(id),
    enabled: !!listing,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl animate-pulse">
        <div className="h-8 w-72 bg-zinc-800 rounded" />
        <div className="h-64 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!listing) {
    return <p className="text-zinc-400 text-center py-16">Listing not found.</p>;
  }

  const locationStr = [listing.city, listing.state].filter(Boolean).join(", ");

  return (
    <div className="space-y-8 max-w-4xl">
      <Link href="/" className="text-zinc-400 hover:text-white text-sm transition-colors inline-block">
        ← Back to search
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {listing.year} {listing.make} {listing.model}
          </h1>
          {locationStr && <p className="text-zinc-400 mt-1">{locationStr}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{fmt$(listing.price)}</p>
          <p className="text-zinc-400 text-sm mt-1">{fmtMi(listing.mileage)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Details */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Details</h2>
          <dl className="space-y-3">
            {DETAILS.map(({ label, key, fmt }) => {
              const raw = listing[key];
              if (!raw) return null;
              const display = fmt ? fmt(raw) : String(raw);
              return (
                <div key={key} className="flex justify-between text-sm">
                  <dt className="text-zinc-400">{label}</dt>
                  <dd className="font-medium capitalize">{display}</dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* Score */}
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Deal Score</h2>
          {scoreLoading && <div className="h-32 bg-zinc-800 rounded-lg animate-pulse" />}

          {!scoreLoading && !score && (
            <p className="text-zinc-400 text-sm">
              Score unavailable — not enough comparable listings in the database.
            </p>
          )}

          {score && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-5xl font-bold">{Math.round(score.score)}</span>
                <ScoreBadge score={Math.round(score.score)} label={score.label} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Market value</span>
                  <span className="font-medium">{fmt$(score.market_value)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">vs market</span>
                  <span
                    className={
                      score.price_delta > 0 ? "text-red-400 font-medium" : "text-emerald-400 font-medium"
                    }
                  >
                    {score.price_delta > 0 ? "+" : ""}
                    {fmt$(score.price_delta)}
                  </span>
                </div>
              </div>

              {/* Factor table */}
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b border-zinc-700 text-zinc-500">
                    <th className="text-left pb-2 font-normal">Factor</th>
                    <th className="text-right pb-2 font-normal">Score</th>
                    <th className="text-right pb-2 font-normal">Max</th>
                  </tr>
                </thead>
                <tbody>
                  {score.factors.map((f) => (
                    <tr key={f.name} className="border-b border-zinc-800">
                      <td className="py-2.5">
                        <p>{f.name}</p>
                        <p className="text-zinc-500 text-xs">{f.note}</p>
                      </td>
                      <td className="text-right font-medium py-2.5">{f.score}</td>
                      <td className="text-right text-zinc-500 py-2.5">{f.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {listing.description && (
        <div className="bg-zinc-900 rounded-xl p-6">
          <h2 className="font-semibold mb-3">Description</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">{listing.description}</p>
        </div>
      )}

      {/* Comparables */}
      {comparables.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4">Similar Listings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {comparables.map((comp) => (
              <SmallCard key={comp.id} listing={comp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
