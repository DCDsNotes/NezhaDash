export const DEFAULT_SITE_NAME = "节点监控"

export function resolveSiteName(siteName: unknown) {
  const normalized = String(siteName || "").trim()
  return normalized || DEFAULT_SITE_NAME
}

export function formatPageTitle(pageName: unknown, siteName: unknown) {
  const resolvedSiteName = resolveSiteName(siteName)
  const resolvedPageName = String(pageName || "").trim()
  return resolvedPageName ? `${resolvedPageName} - ${resolvedSiteName}` : resolvedSiteName
}
