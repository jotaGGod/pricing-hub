import { apiFetch } from "./api";
import type { Product } from "../types";

export type ProductPayload = {
  title: string;
  cost_cents: number;
  default_channel_code?: string | null;
  category?: string | null;
};

export function listProducts() {
  return apiFetch<Product[]>("/products");
}

export function createProduct(payload: ProductPayload) {
  return apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProduct(id: string, payload: ProductPayload) {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteProduct(id: string) {
  return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
}

export function productID(product: Product) {
  return product.ID ?? product.id ?? "";
}

export function productTitle(product: Product) {
  return product.Title ?? product.title ?? "";
}

export function productCost(product: Product) {
  return product.CostCents ?? product.cost_cents ?? 0;
}
