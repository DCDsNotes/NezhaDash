export function getApplicationBaseUrl() {
  return new URL(import.meta.env.BASE_URL || "/", window.location.origin)
}

export function getApplicationBasename() {
  return getApplicationBaseUrl().pathname.replace(/\/$/, "") || "/"
}
