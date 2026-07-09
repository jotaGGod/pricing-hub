import { apiFetch } from "./api";
import type { PricingInput, PricingResult, Simulation } from "../types";

export type SimulationPayload = {
  product_id?: string | null;
  title: string;
  channel_code: string;
  input: PricingInput;
  result: PricingResult;
};

export function listSimulations() {
  return apiFetch<Simulation[]>("/simulations");
}

export function createSimulation(payload: SimulationPayload) {
  return apiFetch<Simulation>("/simulations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteSimulation(id: string) {
  return apiFetch<void>(`/simulations/${id}`, { method: "DELETE" });
}

export function simulationID(simulation: Simulation) {
  return simulation.ID ?? simulation.id ?? "";
}

export function simulationTitle(simulation: Simulation) {
  return simulation.Title ?? simulation.title ?? "";
}

export function simulationResult(simulation: Simulation) {
  return simulation.Result ?? simulation.result;
}

export function simulationCreatedAt(simulation: Simulation) {
  return simulation.CreatedAt ?? simulation.created_at ?? "";
}
