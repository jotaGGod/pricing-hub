import { apiFetch } from "./api";
import type { Theme } from "../types";

type PreferenceResponse = {
  UserID?: string;
  Theme?: Theme;
  user_id?: string;
  theme?: Theme;
};

export async function getPreferences() {
  const preference = await apiFetch<PreferenceResponse>("/preferences");
  return {
    user_id: preference.UserID ?? preference.user_id ?? "",
    theme: preference.Theme ?? preference.theme ?? "dark"
  };
}

export async function updateTheme(theme: Theme) {
  const preference = await apiFetch<PreferenceResponse>("/preferences/theme", {
    method: "PUT",
    body: JSON.stringify({ theme })
  });
  return {
    user_id: preference.UserID ?? preference.user_id ?? "",
    theme: preference.Theme ?? preference.theme ?? theme
  };
}
