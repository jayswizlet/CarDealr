"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getScore } from "@/lib/api";
import ScoreBadge from "./ScoreBadge";
import type { Listing } from "@/lib/types";

function fmt$( n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtMi(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n)) + " mi";
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const { data: score } = useQuery({
    queryKey: ["score", listing.id],
    queryFn: () => getScore(listing.id),
    staleTime: 5 * 60_000,
  });

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-zinc-800 rounded-xl p-5 hover:bg-zinc-700 transition-colors flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-base leading-tight truncate">
              {listing.year} {listing.make} {listing.model}
            </h3>
            {listing.city && listing.state && (
              <p className="text-zinc-400 text-xs mt-0.5">{listing.city}, {listing.state}</p>
            )}
          </div>
          {score ? (
            <ScoreBadge score={Math.round(score.score)} label={score.label} />
          ) : (
            <div className="h-6 w-24 shrink-0 bg-zinc-700 rounded-full animate-pulse" />
          )}
        </div>
        <div className="flex items-end justify-between mt-auto">
          <span className="text-white text-lg font-bold">{fmt$(listing.price)}</span>
          <span className="text-zinc-400 text-sm">{fmtMi(listing.mileage)}</span>
        </div>
      </div>
    </Link>
  );
}
