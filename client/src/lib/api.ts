// API configuration for frontend
// This allows the frontend to work with different backend URLs (local, production, Cloudflare Workers)

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function getApiUrl(path: string): string {
  // If path is already a full URL, return it as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  // If API_BASE already ends with /api, use it directly
  if (API_BASE.endsWith("/api")) {
    return `${API_BASE}/${cleanPath}`;
  }
  
  // If API_BASE is just "/api" or empty, prepend /api
  if (API_BASE === "/api" || API_BASE === "") {
    return `/api/${cleanPath}`;
  }
  
  // Otherwise, use API_BASE as base
  return `${API_BASE}/${cleanPath}`;
}

// Helper to make API calls consistent
export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = getApiUrl(path);
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

