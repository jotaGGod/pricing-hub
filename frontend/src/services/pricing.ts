import { apiFetch } from "./api";
import type { PricingInput, PricingResult } from "../types";

export function calculatePricing(input: PricingInput) {
  return apiFetch<PricingResult>("/pricing/calculate", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
