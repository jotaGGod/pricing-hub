export const pricingDraftStorageKey = "pricing-hub:pricing-draft:v1";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeIntoPricingDraft(patch: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.localStorage.getItem(pricingDraftStorageKey);
    const existing = raw ? JSON.parse(raw) : null;
    const base = isRecord(existing) ? existing : {};
    window.localStorage.setItem(pricingDraftStorageKey, JSON.stringify({ ...base, ...patch }));
  } catch {
    // Local storage can be blocked in private contexts; the draft simply won't be updated.
  }
}
