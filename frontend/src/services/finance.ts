import { apiFetch } from "./api";
import type {
  FinanceCategory,
  FinanceKind,
  FinanceMonthlyPoint,
  FinanceSummary,
  FinanceTransaction
} from "../types";

export type CategoryPayload = {
  name: string;
  kind: FinanceKind;
  icon: string;
  description?: string | null;
  active?: boolean;
};

export type TransactionPayload = {
  category_id: string;
  amount_cents: number;
  description?: string | null;
  period_start: string;
  period_end: string;
};

export type Period = {
  start: string;
  end: string;
};

function periodQuery(period: Period) {
  return `period_start=${encodeURIComponent(period.start)}&period_end=${encodeURIComponent(period.end)}`;
}

export function listCategories() {
  return apiFetch<FinanceCategory[]>("/finance/categories");
}

export function createCategory(payload: CategoryPayload) {
  return apiFetch<FinanceCategory>("/finance/categories", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCategory(id: string, payload: CategoryPayload) {
  return apiFetch<FinanceCategory>(`/finance/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteCategory(id: string) {
  return apiFetch<void>(`/finance/categories/${id}`, { method: "DELETE" });
}

export function listTransactions(period: Period) {
  return apiFetch<FinanceTransaction[]>(`/finance/transactions?${periodQuery(period)}`);
}

export function createTransaction(payload: TransactionPayload) {
  return apiFetch<FinanceTransaction>("/finance/transactions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateTransaction(id: string, payload: TransactionPayload) {
  return apiFetch<FinanceTransaction>(`/finance/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteTransaction(id: string) {
  return apiFetch<void>(`/finance/transactions/${id}`, { method: "DELETE" });
}

export function getSummary(period: Period) {
  return apiFetch<FinanceSummary>(`/finance/summary?${periodQuery(period)}`);
}

export function getSeries(period: Period) {
  return apiFetch<FinanceMonthlyPoint[]>(`/finance/series?${periodQuery(period)}`);
}
