"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getListings, getScore } from "@/lib/api";
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

function ScoreCell({ listingId }: { listingId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["score", listingId],
    queryFn: () => getScore(listingId),
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <td className="px-4 py-3 text-zinc-500 text-sm">…</td>;
  if (!data) return <td className="px-4 py-3 text-zinc-600 text-sm">N/A</td>;
  return (
    <td className="px-4 py-3">
      <ScoreBadge score={Math.round(data.score)} label={data.label} />
    </td>
  );
}

function ListingSearch({
  onSelect,
  disabled,
}: {
  onSelect: (l: Listing) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["listings-search", query],
    queryFn: () => getListings({ make: query, limit: 8 }),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const results = data?.data ?? [];

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={disabled ? "Max 3 listings selected" : "Type a make to search…"}
        className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed placeholder-zinc-500"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden shadow-2xl">
          {results.map((listing) => (
            <button
              key={listing.id}
              className="w-full text-left px-4 py-2.5 hover:bg-zinc-700 transition-colors border-b border-zinc-700/50 last:border-0"
              onMouseDown={() => {
                onSelect(listing);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="text-white text-sm font-medium">
                {listing.year} {listing.make} {listing.model}
              </span>
              <span className="text-zinc-400 text-xs ml-2">
                {fmt$(listing.price)} · {fmtMi(listing.mileage)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type RowDef = { label: string } & (
  | { key: keyof Listing; fmt?: (v: unknown) => string }
  | { render: (l: Listing) => React.ReactNode }
);

const ROWS: RowDef[] = [
  { label: "Make", key: "make" },
  { label: "Model", key: "model" },
  { label: "Year", key: "year" },
  { label: "Price", key: "price", fmt: (v) => fmt$(v as number) },
  { label: "Mileage", key: "mileage", fmt: (v) => fmtMi(v as number) },
  { label: "Condition", key: "condition" },
  { label: "Fuel Type", key: "fuelType" },
  { label: "Transmission", key: "transmission" },
  { label: "Color", key: "color" },
];

export default function ComparePage() {
  const [selected, setSelected] = useState<Listing[]>([]);

  function addListing(listing: Listing) {
    if (selected.find((l) => l.id === listing.id)) return;
    setSelected((prev) => [...prev, listing].slice(0, 3));
  }

  function removeListing(id: number) {
    setSelected((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Compare Listings</h1>
      <p className="text-zinc-400 text-sm mb-6">Select up to 3 listings to compare side by side.</p>

      {/* Search */}
      <div className="max-w-sm mb-6">
        <ListingSearch onSelect={addListing} disabled={selected.length >= 3} />
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selected.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-2 bg-zinc-800 rounded-full px-3 py-1.5 text-sm"
            >
              <span>
                {l.year} {l.make} {l.model}
              </span>
              <button
                onClick={() => removeListing(l.id)}
                className="text-zinc-400 hover:text-white transition-colors leading-none"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {selected.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-4xl mb-3">🚗</p>
          <p>Search for a make above to start comparing.</p>
        </div>
      )}

      {/* Comparison table */}
      {selected.length > 0 && (
        <div className="overflow-x-auto rounded-xl bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-500 font-normal w-36">Feature</th>
                {selected.map((l) => (
                  <th key={l.id} className="text-left px-4 py-3 font-semibold">
                    {l.year} {l.make} {l.model}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-zinc-400">{row.label}</td>
                  {"render" in row
                    ? selected.map((l) => (
                        <td key={l.id} className="px-4 py-3">
                          {row.render(l)}
                        </td>
                      ))
                    : selected.map((l) => {
                        const val = l[row.key];
                        return (
                          <td key={l.id} className="px-4 py-3 capitalize">
                            {val != null
                              ? row.fmt
                                ? row.fmt(val)
                                : String(val)
                              : <span className="text-zinc-600">—</span>}
                          </td>
                        );
                      })}
                </tr>
              ))}
              {/* Score row */}
              <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-4 py-3 text-zinc-400">Score</td>
                {selected.map((l) => (
                  <ScoreCell key={l.id} listingId={l.id} />
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
