export function getApplicationBaseUrl() {
  if (import.meta.env.BASE_URL !== "./") return new URL(import.meta.env.BASE_URL, window.location.origin)

  const entryScript = document.querySelector<HTMLScriptElement>('script[type="module"][src]')
  return entryScript ? new URL("../", entryScript.src) : new URL("./", document.baseURI)
}

export function getApplicationBasename() {
  return getApplicationBaseUrl().pathname.replace(/\/$/, "") || "/"
}
