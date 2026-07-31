import { apiFetch } from "./api";
import type { DefaultCosts, Theme } from "../types";

type PreferenceResponse = {
  UserID?: string;
  Theme?: Theme;
  DefaultCosts?: DefaultCosts;
  user_id?: string;
  theme?: Theme;
  default_costs?: DefaultCosts;
};

const fallbackDefaultCosts: DefaultCosts = {
  tax_bps: 400,
  ads_bps: 0,
  fixed_costs_bps: 0,
  extra_fees_bps: 0,
  seller_discount_bps: 0,
  logistic_cost: { type: "fixed_amount", amount_cents: 0, bps: 0 },
  manual_costs: []
};

function normalizePreference(preference: PreferenceResponse) {
  return {
    user_id: preference.UserID ?? preference.user_id ?? "",
    theme: preference.Theme ?? preference.theme ?? "dark",
    default_costs: preference.DefaultCosts ?? preference.default_costs ?? fallbackDefaultCosts
  };
}

export async function getPreferences() {
  const preference = await apiFetch<PreferenceResponse>("/preferences");
  return normalizePreference(preference);
}

export async function updateTheme(theme: Theme) {
  const preference = await apiFetch<PreferenceResponse>("/preferences/theme", {
    method: "PUT",
    body: JSON.stringify({ theme })
  });
  return normalizePreference(preference);
}

export async function updateDefaultCosts(defaultCosts: DefaultCosts) {
  const preference = await apiFetch<PreferenceResponse>("/preferences/default-costs", {
    method: "PUT",
    body: JSON.stringify(defaultCosts)
  });
  return normalizePreference(preference);
}
