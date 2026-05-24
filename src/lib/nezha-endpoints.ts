const DEFAULT_API_BASE_URL = "/api/v1"

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function normalizeApiBaseUrl(value: string | undefined) {
  const baseUrl = value?.trim()
  if (!baseUrl) return DEFAULT_API_BASE_URL

  try {
    const url = new URL(baseUrl)
    if (url.pathname === "/") {
      url.pathname = DEFAULT_API_BASE_URL
    }
    return trimTrailingSlash(url.toString())
  } catch {
    // Relative paths are valid here.
  }

  return trimTrailingSlash(baseUrl)
}

export const nezhaApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_NEZHA_API_BASE_URL)

export function nezhaApiUrl(path: string) {
  const endpoint = path.startsWith("/") ? path : `/${path}`
  return `${nezhaApiBaseUrl}${endpoint}`
}

export function nezhaWebSocketUrl(path: string) {
  const apiUrl = new URL(nezhaApiUrl(path), window.location.origin)
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:"
  return apiUrl.toString()
}
