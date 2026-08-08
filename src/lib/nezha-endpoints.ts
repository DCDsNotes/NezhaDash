const DEFAULT_API_BASE_URL = "/api/v1"

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function normalizeApiBaseUrl(value: string | undefined) {
  const baseUrl = value?.trim()
  if (!baseUrl) return DEFAULT_API_BASE_URL

  if (/^[a-z][a-z\d+.-]*:/i.test(baseUrl)) {
    try {
      const url = new URL(baseUrl)
      if (url.protocol !== "http:" && url.protocol !== "https:") return DEFAULT_API_BASE_URL
      if (url.pathname === "/") url.pathname = DEFAULT_API_BASE_URL
      url.search = ""
      url.hash = ""
      return trimTrailingSlash(url.toString())
    } catch {
      return DEFAULT_API_BASE_URL
    }
  }

  if (baseUrl.startsWith("//")) return DEFAULT_API_BASE_URL
  return trimTrailingSlash(`/${baseUrl.replace(/^\/+/, "")}`)
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
