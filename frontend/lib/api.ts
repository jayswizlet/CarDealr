import axios from "axios";
import type { Listing, ScoreResponse, PaginatedListings, ListingFilters } from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

export async function getMakes(): Promise<string[]> {
  const { data } = await api.get("/api/makes");
  return data;
}

export async function getListings(filters: ListingFilters = {}): Promise<PaginatedListings> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
  );
  const { data } = await api.get("/api/listings", { params });
  return data;
}

export async function getListing(id: number): Promise<Listing> {
  const { data } = await api.get(`/api/listings/${id}`);
  return data;
}

export async function getScore(id: number): Promise<ScoreResponse> {
  const { data } = await api.get(`/api/listings/${id}/score`);
  return data;
}

export async function getComparables(id: number): Promise<Listing[]> {
  const { data } = await api.get(`/api/listings/${id}/comparables`);
  return data;
}
