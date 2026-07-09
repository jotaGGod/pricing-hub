import { apiFetch } from "./api";
import type { AuthResponse } from "../types";

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    skipRefresh: true,
    body: JSON.stringify({ email, password })
  });
}

export function register(name: string, email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    skipRefresh: true,
    body: JSON.stringify({ name, email, password })
  });
}

export function me() {
  return apiFetch<AuthResponse>("/auth/me");
}

export function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST", skipRefresh: true });
}

export function googleStartUrl() {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";
  return `${apiUrl}/auth/google/start`;
}
