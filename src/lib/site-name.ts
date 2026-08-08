export const DEFAULT_SITE_NAME = "节点监控"

const LEGACY_SITE_NAMES = new Set(["哪吒监控", "哪吒探针"])

export function resolveSiteName(siteName: unknown) {
  const normalized = String(siteName || "").trim()
  return !normalized || LEGACY_SITE_NAMES.has(normalized) ? DEFAULT_SITE_NAME : normalized
}
