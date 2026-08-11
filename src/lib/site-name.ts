export const DEFAULT_SITE_NAME = "节点监控"

const LEGACY_SITE_NAMES = new Set(["哪吒监控", "哪吒探针"])

export function resolveSiteName(siteName: unknown) {
  const normalized = String(siteName || "").trim()
  return !normalized || LEGACY_SITE_NAMES.has(normalized) ? DEFAULT_SITE_NAME : normalized
}

export function formatPageTitle(pageName: unknown, siteName: unknown) {
  const resolvedSiteName = resolveSiteName(siteName)
  const resolvedPageName = String(pageName || "").trim()
  return resolvedPageName ? `${resolvedPageName} - ${resolvedSiteName}` : resolvedSiteName
}
