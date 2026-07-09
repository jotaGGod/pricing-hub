const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

type ApiOptions = RequestInit & {
  skipRefresh?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await request(path, options);
  if (response.status === 401 && !options.skipRefresh && path !== "/auth/refresh") {
    const refreshed = await request("/auth/refresh", {
      method: "POST",
      skipRefresh: true
    });
    if (refreshed.ok) {
      return apiFetch<T>(path, { ...options, skipRefresh: true });
    }
  }
  return parseResponse<T>(response);
}

function request(path: string, options: ApiOptions = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include"
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? "Erro na requisicao");
  }
  return data as T;
}
