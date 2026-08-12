export type DiagnosticState = "idle" | "running" | "success" | "warning" | "error"

type SplitMethod = "trace" | "header" | "google-dns"

export interface PublicIpResult {
  ip: string
  location?: string
  source: string
}

export interface SplitTarget {
  id: string
  label: string
  category: string
  url: string
  logoUrl: string
  method: SplitMethod
  headerNames?: string[]
  fallbackUrl?: string
}

export interface SplitResult extends SplitTarget {
  state: Exclude<DiagnosticState, "warning">
  ip?: string
  countryCode?: string
  country?: string
  region?: string
  city?: string
  location?: string
  asn?: string
  isp?: string
  timezone?: string
  utcOffset?: string
  ipPrefix?: number
  duration?: number
  message?: string
}

export type AiServiceId = "claude" | "chatgpt"

export interface AiRiskResult {
  ip: string
  trustScore?: number
  country?: string
  countryCode?: string
  region?: string
  city?: string
  timezone?: string
  asn?: string
  isp?: string
  connectionType?: string
  residential?: boolean
  datacenter?: boolean
  vpn?: boolean
  proxy?: boolean
  tor?: boolean
  crawler?: boolean
  abuser?: boolean
  companyType?: string
}

export interface DnsResolver {
  ip: string
  provider?: string
  location?: string
}

export interface DnsLeakResult {
  resolvers: DnsResolver[]
  complete: boolean
  source: "same-origin" | "ip-api"
}

export interface WebRtcCandidate {
  address: string
  protocol?: string
  type?: string
  private: boolean
}

export interface WebRtcResult {
  state: "success" | "warning"
  candidates: WebRtcCandidate[]
  publicAddresses: string[]
  message: string
}

export interface NetworkDiagnosticsRuntimeConfig {
  splitTargets?: Array<Partial<SplitTarget> & Pick<SplitTarget, "label" | "url">>
  dnsLeakEndpoint?: string
  stunUrls?: string[]
  aiRiskEndpoint?: string
}

declare global {
  interface Window {
    NetworkDiagnosticsConfig?: NetworkDiagnosticsRuntimeConfig
  }
}

export const getSiteLogoUrl = (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`

const traceTarget = (
  id: string,
  label: string,
  category: string,
  domain: string,
  logoDomain = domain,
  fallbackDomain?: string,
): SplitTarget => ({
  id,
  label,
  category,
  url: `https://${domain}/cdn-cgi/trace`,
  logoUrl: getSiteLogoUrl(logoDomain),
  method: "trace",
  fallbackUrl: fallbackDomain ? `https://${fallbackDomain}/cdn-cgi/trace` : undefined,
})

const DEFAULT_SPLIT_TARGETS: SplitTarget[] = [
  {
    id: "netease",
    label: "网易",
    category: "国内",
    url: "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png",
    logoUrl: getSiteLogoUrl("www.163.com"),
    method: "header",
    headerNames: ["cdn-user-ip"],
  },
  {
    id: "bytedance",
    label: "字节跳动",
    category: "国内",
    url: "https://perfops.byte-test.com/500b-bench.jpg",
    logoUrl: getSiteLogoUrl("www.bytedance.com"),
    method: "header",
    headerNames: ["x-request-ip", "x-response-cinfo"],
  },
  {
    id: "google-location",
    label: "Google",
    category: "搜索与定位",
    url: "https://dns.google/resolve?name=o-o.myaddr.l.google.com&type=TXT",
    logoUrl: getSiteLogoUrl("www.google.com"),
    method: "google-dns",
  },
  traceTarget("cloudflare-cn", "Cloudflare 中国", "国内", "www.cloudflare-cn.com"),
  traceTarget("qualcomm-cn", "高通中国", "国内", "www.qualcomm.cn"),
  traceTarget("discord", "Discord", "社交与通讯", "gateway.discord.gg", "discord.com"),
  traceTarget("x", "X", "社交与通讯", "x.com"),
  traceTarget("medium", "Medium", "社交与通讯", "medium.com"),
  traceTarget("anthropic", "Anthropic", "AI", "anthropic.com"),
  traceTarget("claude", "Claude", "AI", "claude.ai"),
  traceTarget("chatgpt", "ChatGPT", "AI", "chatgpt.com"),
  traceTarget("openai", "OpenAI API", "AI", "api.openai.com", "openai.com"),
  traceTarget("sora", "Sora", "AI", "sora.com"),
  traceTarget("grok", "Grok", "AI", "grok.com"),
  traceTarget("pixpix", "PixPix", "AI", "pixpix.com"),
  traceTarget("perplexity", "Perplexity", "AI", "www.perplexity.ai"),
  traceTarget("midjourney", "Midjourney", "AI", "midjourney.com"),
  traceTarget("coinbase", "Coinbase", "数字资产", "coinbase.com"),
  traceTarget("okx", "OKX", "数字资产", "www.okx.com"),
  traceTarget("binance", "Binance", "数字资产", "www.binance.info"),
  traceTarget("crypto", "Crypto.com", "数字资产", "crypto.com"),
  traceTarget("zoom", "Zoom", "办公与工具", "zoom.us"),
  traceTarget("one-password", "1Password", "办公与工具", "1password.com"),
  traceTarget("wise", "Wise", "办公与工具", "wise.com"),
  traceTarget("notion", "Notion", "办公与工具", "notion.so"),
  traceTarget("shopify", "Shopify", "办公与工具", "shopify.com"),
  traceTarget("godaddy", "GoDaddy", "办公与工具", "godaddy.com"),
  traceTarget("product-hunt", "Product Hunt", "办公与工具", "producthunt.com"),
  traceTarget("cloudflare", "Cloudflare", "网络", "www.cloudflare.com", "www.cloudflare.com", "speed.cloudflare.com"),
  traceTarget("cdnjs", "cdnjs", "开发与 CDN", "cdnjs.cloudflare.com", "cdnjs.com", "speed.cloudflare.com"),
  traceTarget("npm", "npm Registry", "开发与 CDN", "registry.npmjs.org", "www.npmjs.com"),
  traceTarget("kali", "Kali Download", "开发与 CDN", "kali.download"),
  traceTarget("unpkg", "unpkg", "开发与 CDN", "unpkg.com"),
  traceTarget("nodejs", "Node.js", "开发与 CDN", "nodejs.org"),
  traceTarget("gitlab", "GitLab", "开发与 CDN", "gitlab.com"),
  traceTarget("crunchyroll", "Crunchyroll", "流媒体", "crunchyroll.com"),
]

const REQUEST_TIMEOUT = 6_000
const MAX_RESPONSE_BYTES = 64 * 1_024
const PUBLIC_IP_CACHE_TTL = 5 * 60_000
const SPLIT_CACHE_TTL = 5 * 60_000
const IP_GEOGRAPHY_CACHE_TTL = 24 * 60 * 60_000
const AI_RISK_CACHE_TTL = 24 * 60 * 60_000
const MAX_CUSTOM_TARGETS = 40
const MAX_DNS_ROUNDS = 8
const DEFAULT_STUN_URLS = ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478", "stun:stun1.l.google.com:19302"]

let publicIpCache: { result: PublicIpResult; expiresAt: number } | null = null
const splitCache = new Map<string, { result: SplitResult; expiresAt: number }>()
type SplitGeography = Pick<SplitResult, "countryCode" | "country" | "region" | "city" | "location" | "asn" | "isp" | "timezone" | "utcOffset">

const ipGeographyCache = new Map<string, { result: SplitGeography; expiresAt: number }>()
const ipGeographyTasks = new Map<string, Promise<SplitGeography>>()
const aiRiskCache = new Map<string, { result: AiRiskResult; expiresAt: number }>()
const aiRiskTasks = new Map<string, Promise<AiRiskResult>>()

type RegionNames = { of: (countryCode: string) => string | undefined }
type IntlWithDisplayNames = typeof Intl & {
  DisplayNames?: new (locales: string | string[], options: { type: "region" }) => RegionNames
}

const regionNames = (() => {
  try {
    const DisplayNames = (Intl as IntlWithDisplayNames).DisplayNames
    return DisplayNames ? new DisplayNames("en", { type: "region" }) : undefined
  } catch {
    return undefined
  }
})()

const regionNameFallbacks: Record<string, string> = {
  CN: "China",
  DE: "Germany",
  FR: "France",
  GB: "United Kingdom",
  HK: "Hong Kong",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  TW: "Taiwan",
  US: "United States",
}

export function formatGeolocation(location?: string, countryCode?: string) {
  const value = location?.trim()
  const code = (/^[a-z]{2}$/i.test(value || "") ? value : countryCode)?.toUpperCase()
  if (!code || (value && value.toUpperCase() !== code)) return value
  return regionNames?.of(code) || regionNameFallbacks[code] || value || code
}

function isSafeHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

function normaliseAddress(value: string) {
  return value
    .trim()
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
}

function isIpv4Address(value: string) {
  const parts = value.split(".").map(Number)
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
}

function isIpv6Address(value: string) {
  if (!/^[0-9a-f:.]+$/i.test(value) || value.length > 45) return false
  const compressed = value.split("::")
  if (compressed.length > 2) return false

  let groupCount = 0
  for (const [sectionIndex, section] of compressed.entries()) {
    if (!section) continue
    const groups = section.split(":")
    for (const [groupIndex, group] of groups.entries()) {
      if (group.includes(".")) {
        if (sectionIndex !== compressed.length - 1 || groupIndex !== groups.length - 1 || !isIpv4Address(group)) return false
        groupCount += 2
      } else {
        if (!/^[0-9a-f]{1,4}$/i.test(group)) return false
        groupCount += 1
      }
    }
  }

  return compressed.length === 2 ? groupCount < 8 : groupCount === 8
}

function isIpAddress(value: string) {
  const address = normaliseAddress(value)
  if (address.includes(":")) return isIpv6Address(address)
  return isIpv4Address(address)
}

function findIp(value: string | null) {
  if (!value) return undefined
  const matches = value.match(/(?:\d{1,3}\.){3}\d{1,3}|[0-9a-f]{0,4}:[0-9a-f:]+/gi) || []
  return matches.map(normaliseAddress).find(isIpAddress)
}

function sanitiseText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
    : undefined
}

function sanitiseSplitTargets(targets: NetworkDiagnosticsRuntimeConfig["splitTargets"]): SplitTarget[] {
  if (!Array.isArray(targets)) return []

  return targets.slice(0, MAX_CUSTOM_TARGETS).flatMap((target, index) => {
    const label = sanitiseText(target.label, 36)
    const url = target.url?.trim()
    if (!label || !url || !isSafeHttpsUrl(url)) return []

    return [
      {
        id: `${sanitiseText(target.id, 40) || "custom"}-${index + 1}`,
        label,
        category: sanitiseText(target.category, 20) || "自定义站点",
        url,
        logoUrl: getSiteLogoUrl(new URL(url).hostname),
        method: "trace" as const,
      },
    ]
  })
}

export function getSplitTargets() {
  const configured = sanitiseSplitTargets(window.NetworkDiagnosticsConfig?.splitTargets)
  return configured.length > 0 ? configured : DEFAULT_SPLIT_TARGETS
}

export function getCachedSplitResults() {
  const now = Date.now()
  return [...splitCache.values()].flatMap((entry) => {
    if (entry.expiresAt <= now) return []
    return [entry.result]
  })
}

export function getDnsEndpoint() {
  const configured = window.NetworkDiagnosticsConfig?.dnsLeakEndpoint?.trim()
  if (!configured) return null

  try {
    const endpoint = new URL(configured, window.location.href)
    if (endpoint.origin !== window.location.origin || !["http:", "https:"].includes(endpoint.protocol)) return null
    return endpoint.toString()
  } catch {
    return null
  }
}

function getAiRiskEndpoint(ip: string) {
  const configured = window.NetworkDiagnosticsConfig?.aiRiskEndpoint?.trim()
  if (!configured) return `https://whatismyip.ai/api/lookup/${encodeURIComponent(ip)}`

  try {
    const endpoint = new URL(configured, window.location.href)
    if (endpoint.origin !== window.location.origin || !["http:", "https:"].includes(endpoint.protocol)) return null
    endpoint.pathname = endpoint.pathname.replace(/\{ip\}/g, encodeURIComponent(ip))
    return endpoint.toString()
  } catch {
    return null
  }
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined
}

export async function checkAiRisk(ip: string, signal: AbortSignal, force = false): Promise<AiRiskResult> {
  if (!isIpAddress(ip)) throw new Error("AI 出口 IP 无效")
  const cached = aiRiskCache.get(ip)
  if (!force && cached && cached.expiresAt > Date.now()) return cached.result
  const running = aiRiskTasks.get(ip)
  if (running) return running

  const endpoint = getAiRiskEndpoint(ip)
  if (!endpoint) throw new Error("AI 风控接口配置无效")
  const task = (async () => {
    const text = await fetchText(endpoint, signal, { headers: { Accept: "application/json" } })
    const parsed = JSON.parse(text.slice(0, 8_192)) as Record<string, unknown>
    const data = parsed.data && typeof parsed.data === "object" ? (parsed.data as Record<string, unknown>) : parsed
    const location = data.location && typeof data.location === "object" ? (data.location as Record<string, unknown>) : data
    const network = data.network && typeof data.network === "object" ? (data.network as Record<string, unknown>) : data
    const security = data.security && typeof data.security === "object" ? (data.security as Record<string, unknown>) : data
    const score = Number(security.score ?? data.riskScore ?? data.risk_score)
    const trustScore = Number.isFinite(score) ? Math.round(Math.max(0, Math.min(100, score <= 1 ? (1 - score) * 100 : 100 - score))) : undefined
    const connectionType = sanitiseText(network.connectionType ?? data.connection_type ?? data.companyType ?? data.company_type, 32)
    const result: AiRiskResult = {
      ip,
      trustScore,
      country: sanitiseText(location.country, 48),
      countryCode: sanitiseText(location.countryCode ?? location.country_code, 2)?.toUpperCase(),
      region: sanitiseText(location.region, 48),
      city: sanitiseText(location.city, 48),
      timezone: sanitiseText(location.timezone ?? data.timezone, 48),
      asn: sanitiseText(network.asn ?? data.asn, 16),
      isp: sanitiseText(network.isp ?? network.org ?? data.isp, 64),
      connectionType,
      residential: connectionType ? /residential|home|broadband/i.test(connectionType) : optionalBoolean(data.isResidential ?? data.is_residential),
      datacenter: optionalBoolean(security.isHosting ?? security.hosting ?? data.isDatacenter ?? data.is_datacenter),
      vpn: optionalBoolean(security.isVpn ?? security.vpn ?? data.isVpn ?? data.is_vpn),
      proxy: optionalBoolean(security.isProxy ?? security.proxy ?? data.isProxy ?? data.is_proxy),
      tor: optionalBoolean(security.isTor ?? security.tor ?? data.isTor ?? data.is_tor),
      crawler: optionalBoolean(security.isCrawler ?? security.crawler ?? data.isCrawler ?? data.is_crawler),
      abuser: optionalBoolean(security.isBlacklisted ?? security.blacklisted ?? data.isAbuser ?? data.is_abuser),
      companyType: sanitiseText(data.companyType ?? data.company_type, 32),
    }
    aiRiskCache.set(ip, { result, expiresAt: Date.now() + AI_RISK_CACHE_TTL })
    return result
  })()
  aiRiskTasks.set(ip, task)
  try {
    return await task
  } finally {
    if (aiRiskTasks.get(ip) === task) aiRiskTasks.delete(ip)
  }
}

function getStunUrls() {
  const configured = window.NetworkDiagnosticsConfig?.stunUrls
    ?.map((url) => url.trim())
    .filter((url) => /^stuns?:[^\s]+$/i.test(url))
    .slice(0, 3)

  return configured?.length ? configured : DEFAULT_STUN_URLS
}

function withTimeout(parentSignal: AbortSignal, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timer = window.setTimeout(abort, timeout)

  if (parentSignal.aborted) abort()
  else parentSignal.addEventListener("abort", abort, { once: true })

  return {
    signal: controller.signal,
    dispose() {
      window.clearTimeout(timer)
      parentSignal.removeEventListener("abort", abort)
    },
  }
}

function getSplitRequestMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return "请求超时"
  if (error instanceof Error && /abort(?:ed)?(?: without reason)?/i.test(error.message)) return "请求超时"
  if (error instanceof Error && /^Failed to fetch$/i.test(error.message)) return "网络不可达或被浏览器拦截"
  return error instanceof Error ? error.message : "请求失败"
}

async function fetchText(url: string, parentSignal: AbortSignal, init?: RequestInit) {
  const request = withTimeout(parentSignal)
  try {
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      ...init,
      signal: request.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const declaredLength = Number(response.headers.get("content-length"))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) throw new Error("响应数据过大")
    if (!response.body) {
      const text = await response.text()
      if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) throw new Error("响应数据过大")
      return text
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytesRead = 0
    let text = ""
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytesRead += value.byteLength
        if (bytesRead > MAX_RESPONSE_BYTES) {
          await reader.cancel()
          throw new Error("响应数据过大")
        }
        text += decoder.decode(value, { stream: true })
      }
      return text + decoder.decode()
    } finally {
      reader.releaseLock()
    }
  } finally {
    request.dispose()
  }
}

function parseIpCn(text: string): PublicIpResult | null {
  const ip = findIp(text)
  if (!ip) return null
  const location = sanitiseText(text.match(/归属地[：:]\s*(.+)/)?.[1], 120)
  return { ip, location, source: "IP.cn" }
}

function parseIp138(text: string): PublicIpResult | null {
  const ip = findIp(text)
  if (!ip) return null
  const location = sanitiseText(text.match(/来自[：:]\s*([^<\r\n]+)/)?.[1], 120)
  return { ip, location, source: "iP138.com" }
}

export function getCachedPublicIp() {
  return publicIpCache && publicIpCache.expiresAt > Date.now() ? publicIpCache.result : null
}

export async function checkPublicIp(signal: AbortSignal, force = false): Promise<PublicIpResult> {
  const cached = getCachedPublicIp()
  if (!force && cached) return cached

  const providers = [
    { url: "https://my.ip.cn/", parse: parseIpCn },
    { url: "https://2026.ip138.com/", parse: parseIp138 },
  ]

  for (const provider of providers) {
    try {
      const result = provider.parse((await fetchText(provider.url, signal)).slice(0, 16_384))
      if (result) {
        publicIpCache = { result, expiresAt: Date.now() + PUBLIC_IP_CACHE_TTL }
        return result
      }
    } catch (error) {
      if (signal.aborted) throw error
    }
  }

  throw new Error("无法连接 IP 查询服务")
}

function parseTrace(text: string) {
  const fields = new Map(
    text
      .slice(0, 8_192)
      .split(/\r?\n/)
      .map((line) => line.split(/=(.*)/s).slice(0, 2))
      .filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0])),
  )
  const ip = normaliseAddress(fields.get("ip") || "")
  const countryCode = sanitiseText(fields.get("loc")?.toUpperCase(), 2)
  return {
    ip: isIpAddress(ip) ? ip : undefined,
    countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined,
    location: formatGeolocation(countryCode, countryCode),
  }
}

function parseGoogleDnsSubnet(text: string) {
  const data = JSON.parse(text.slice(0, 8_192)) as {
    Status?: unknown
    Answer?: unknown
    edns_client_subnet?: unknown
  }
  if (data.Status !== 0) return {}

  const answers = Array.isArray(data.Answer)
    ? data.Answer.flatMap((answer) => {
        if (!answer || typeof answer !== "object") return []
        const value = sanitiseText((answer as { data?: unknown }).data, 128)
        return value ? [value] : []
      })
    : []
  const subnet = [...answers.filter((answer) => /edns0-client-subnet/i.test(answer)), sanitiseText(data.edns_client_subnet, 128)].find(
    (value): value is string => Boolean(value),
  )
  if (!subnet) return {}

  const normalisedSubnet = subnet.toLowerCase()
  const ip = findIp(normalisedSubnet)
  if (!ip) return {}

  const prefix = Number(normalisedSubnet.slice(normalisedSubnet.indexOf(ip) + ip.length).match(/^\/(\d{1,3})/)?.[1])
  const maxPrefix = ip.includes(":") ? 128 : 32
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= maxPrefix ? { ip, ipPrefix: prefix } : {}
}

async function lookupIpGeography(ip: string, signal: AbortSignal): Promise<SplitGeography> {
  const cached = ipGeographyCache.get(ip)
  if (cached && cached.expiresAt > Date.now()) return cached.result
  const running = ipGeographyTasks.get(ip)
  if (running) return running

  const task = (async () => {
    try {
      const text = await fetchText(
        `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code,region,city,connection,timezone`,
        signal,
      )
      const data = JSON.parse(text.slice(0, 2_048)) as {
        success?: unknown
        country?: unknown
        country_code?: unknown
        region?: unknown
        city?: unknown
        connection?: { asn?: unknown; org?: unknown; isp?: unknown }
        timezone?: { id?: unknown; utc?: unknown }
      }
      if (data.success !== true) return {}

      const countryCode = sanitiseText(data.country_code, 2)?.toUpperCase()
      const country = sanitiseText(data.country, 48)
      const region = sanitiseText(data.region, 48)
      const city = sanitiseText(data.city, 48)
      const isp = sanitiseText(data.connection?.isp || data.connection?.org, 64)
      const location = [country, region, city, isp]
        .map((value) => sanitiseText(value, 48))
        .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
        .join(" ")
      const result = {
        countryCode: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : undefined,
        country,
        region,
        city,
        location: sanitiseText(location, 120),
        asn: Number.isFinite(Number(data.connection?.asn)) ? `AS${Number(data.connection?.asn)}` : undefined,
        isp,
        timezone: sanitiseText(data.timezone?.id, 48),
        utcOffset: sanitiseText(data.timezone?.utc, 8),
      }
      ipGeographyCache.set(ip, { result, expiresAt: Date.now() + IP_GEOGRAPHY_CACHE_TTL })
      return result
    } catch (error) {
      if (signal.aborted) throw error
      return {}
    }
  })()
  ipGeographyTasks.set(ip, task)
  try {
    return await task
  } finally {
    if (ipGeographyTasks.get(ip) === task) ipGeographyTasks.delete(ip)
  }
}

async function requestSplitTarget(target: SplitTarget, parentSignal: AbortSignal) {
  if (target.method === "trace") {
    let trace: ReturnType<typeof parseTrace> | undefined
    let failure: unknown
    for (const url of [target.url, target.fallbackUrl].filter((value): value is string => Boolean(value))) {
      try {
        trace = parseTrace(await fetchText(url, parentSignal))
        if (trace.ip) break
      } catch (error) {
        if (parentSignal.aborted) throw error
        failure = error
      }
    }
    if (!trace) throw failure instanceof Error ? failure : new Error("响应中没有出口 IP")
    if (!trace.ip) return trace
    const geography = await lookupIpGeography(trace.ip, parentSignal)
    return {
      ...trace,
      countryCode: geography.countryCode || trace.countryCode,
      location: geography.location || trace.location,
    }
  }
  if (target.method === "google-dns") {
    const subnet = parseGoogleDnsSubnet(await fetchText(target.url, parentSignal))
    return subnet.ip ? { ...subnet, ...(await lookupIpGeography(subnet.ip, parentSignal)) } : subnet
  }

  const request = withTimeout(parentSignal)
  try {
    const response = await fetch(target.url, {
      method: "HEAD",
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: request.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const ip = target.headerNames?.map((name) => findIp(response.headers.get(name))).find(Boolean)
    return ip ? { ip, ...(await lookupIpGeography(ip, parentSignal)) } : { ip }
  } finally {
    request.dispose()
  }
}

export async function checkSplitTarget(target: SplitTarget, parentSignal: AbortSignal): Promise<SplitResult> {
  const startedAt = performance.now()
  try {
    const result = await requestSplitTarget(target, parentSignal)
    if (!result.ip) throw new Error("响应中没有出口 IP")

    const completed: SplitResult = {
      ...target,
      ...result,
      state: "success",
      duration: Math.round(performance.now() - startedAt),
    }
    splitCache.set(target.id, { result: completed, expiresAt: Date.now() + SPLIT_CACHE_TTL })
    return completed
  } catch (error) {
    if (parentSignal.aborted) throw error
    return {
      ...target,
      state: "error",
      duration: Math.round(performance.now() - startedAt),
      message: getSplitRequestMessage(error),
    }
  }
}

export async function checkSplitTargets(targets: SplitTarget[], signal: AbortSignal, onResult: (result: SplitResult) => void) {
  const results = new Array<SplitResult>(targets.length)
  let nextIndex = 0

  async function worker() {
    while (!signal.aborted) {
      const index = nextIndex++
      const target = targets[index]
      if (!target) return
      const result = await checkSplitTarget(target, signal)
      results[index] = result
      onResult(result)
    }
  }

  const concurrency = targets.length > 12 ? 4 : 3
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()))
  return results.filter(Boolean)
}

async function postJson<T>(endpoint: string, body: unknown, parentSignal: AbortSignal): Promise<T> {
  const request = withTimeout(parentSignal)
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(body),
      signal: request.signal,
    })
    if (!response.ok) throw new Error(`DNS 检测服务返回 HTTP ${response.status}`)
    return (await response.json()) as T
  } finally {
    request.dispose()
  }
}

function wait(duration: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let timer = 0
    const cleanup = () => signal.removeEventListener("abort", abort)
    const finish = () => {
      cleanup()
      resolve()
    }
    const abort = () => {
      window.clearTimeout(timer)
      cleanup()
      reject(new DOMException("检测已取消", "AbortError"))
    }
    if (signal.aborted) {
      abort()
      return
    }
    signal.addEventListener("abort", abort, { once: true })
    timer = window.setTimeout(finish, duration)
  })
}

type DnsStartResponse = { sessionId: string; probeUrls?: string[] }

async function checkSameOriginDnsLeak(endpoint: string, rounds: number, signal: AbortSignal): Promise<DnsLeakResult> {
  const started = await postJson<DnsStartResponse>(endpoint, { action: "start", rounds }, signal)
  if (!started.sessionId) throw new Error("DNS 检测服务未返回会话标识")

  const probeUrls = (started.probeUrls || []).filter(isSafeHttpsUrl).slice(0, rounds)
  await Promise.allSettled(
    probeUrls.map(async (url) => {
      const request = withTimeout(signal, 3_000)
      try {
        await fetch(url, { mode: "no-cors", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: request.signal })
      } finally {
        request.dispose()
      }
    }),
  )

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await wait(700, signal)
    const result = await postJson<{ resolvers?: DnsResolver[]; complete?: boolean }>(
      endpoint,
      { action: "result", sessionId: started.sessionId },
      signal,
    )
    if (result.complete || result.resolvers?.length) {
      const resolvers = Array.isArray(result.resolvers)
        ? result.resolvers.slice(0, 12).flatMap((resolver) => {
            const ip = typeof resolver?.ip === "string" ? normaliseAddress(resolver.ip).slice(0, 64) : ""
            if (!isIpAddress(ip)) return []
            return [
              {
                ip,
                provider: sanitiseText(resolver.provider, 80),
                location: sanitiseText(resolver.location, 80),
              },
            ]
          })
        : []
      return { resolvers, complete: Boolean(result.complete), source: "same-origin" }
    }
  }

  return { resolvers: [], complete: false, source: "same-origin" }
}

async function checkIpApiDnsLeak(rounds: number, signal: AbortSignal): Promise<DnsLeakResult> {
  const resolvers = new Map<string, DnsResolver>()
  let nextIndex = 0

  async function worker() {
    while (!signal.aborted) {
      const index = nextIndex++
      if (index >= rounds) return
      const token = crypto.randomUUID().replace(/-/g, "")
      try {
        const text = await fetchText(`https://${token}.edns.ip-api.com/json`, signal)
        const data = JSON.parse(text.slice(0, 8_192)) as { dns?: { ip?: unknown; geo?: unknown } }
        const ip = typeof data.dns?.ip === "string" ? normaliseAddress(data.dns.ip) : ""
        if (!isIpAddress(ip)) continue
        const geo = sanitiseText(data.dns?.geo, 120)
        const parts = geo?.split(/\s+-\s+/) || []
        resolvers.set(ip, {
          ip,
          location: parts[0] || geo,
          provider: parts.slice(1).join(" - ") || undefined,
        })
      } catch (error) {
        if (signal.aborted) throw error
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(2, rounds) }, () => worker()))
  return { resolvers: [...resolvers.values()].slice(0, 12), complete: true, source: "ip-api" }
}

export function checkDnsLeak(endpoint: string | null, rounds: number, signal: AbortSignal) {
  const safeRounds = Math.max(1, Math.min(MAX_DNS_ROUNDS, Math.floor(rounds)))
  return endpoint ? checkSameOriginDnsLeak(endpoint, safeRounds, signal) : checkIpApiDnsLeak(safeRounds, signal)
}

function isPrivateAddress(value: string) {
  const address = normaliseAddress(value)
  if (address.endsWith(".local")) return true
  if (address === "::" || address === "::1" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true

  const parts = address.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  )
}

function parseCandidate(candidate: RTCIceCandidate): WebRtcCandidate | null {
  const fields = candidate.candidate.split(/\s+/)
  const address = normaliseAddress(candidate.address || fields[4] || "")
  if (!address || (!isIpAddress(address) && !address.endsWith(".local"))) return null
  const typeIndex = fields.indexOf("typ")

  return {
    address,
    protocol: candidate.protocol || fields[2]?.toLowerCase(),
    type: candidate.type || (typeIndex >= 0 ? fields[typeIndex + 1] : undefined),
    private: isPrivateAddress(address),
  }
}

export async function checkWebRtcLeak(baselineAddresses: string[] | Promise<string[]>, signal: AbortSignal): Promise<WebRtcResult> {
  if (!("RTCPeerConnection" in window)) throw new Error("当前浏览器不支持 WebRTC 检测")

  const peer = new RTCPeerConnection({ iceServers: [{ urls: getStunUrls() }] })
  const candidates = new Map<string, WebRtcCandidate>()

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false
      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        signal.removeEventListener("abort", abort)
        if (error) reject(error)
        else resolve()
      }
      const abort = () => finish(new DOMException("检测已取消", "AbortError"))
      const timer = window.setTimeout(() => finish(), 6_000)

      peer.onicecandidate = ({ candidate }) => {
        if (!candidate) {
          finish()
          return
        }
        const parsed = parseCandidate(candidate)
        if (parsed) candidates.set(`${parsed.address}-${parsed.protocol}-${parsed.type}`, parsed)
      }
      peer.onicecandidateerror = () => {
        // UDP may be blocked. The timeout still returns a useful neutral result.
      }
      if (signal.aborted) abort()
      else signal.addEventListener("abort", abort, { once: true })

      peer.createDataChannel("diagnostics")
      void peer
        .createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .catch((error: Error) => finish(error))
    })
  } finally {
    peer.close()
  }

  const list = [...candidates.values()]
  const publicAddresses = [...new Set(list.filter((candidate) => !candidate.private).map((candidate) => candidate.address))]
  const baseline = new Set((await baselineAddresses).map(normaliseAddress).filter(Boolean))
  const exposesPrivateAddress = list.some((candidate) => candidate.private && !candidate.address.endsWith(".local"))

  if (publicAddresses.length === 0) {
    return {
      state: exposesPrivateAddress ? "warning" : "success",
      candidates: list,
      publicAddresses,
      message: exposesPrivateAddress
        ? "未取得公网 UDP 出口，但浏览器暴露了局域网地址。"
        : "未发现公网候选。WebRTC 可能受到保护，或当前网络阻止了 UDP。",
    }
  }

  const hasDifferentExit = baseline.size > 0 && publicAddresses.some((address) => !baseline.has(address))
  return {
    state: hasDifferentExit || exposesPrivateAddress ? "warning" : "success",
    candidates: list,
    publicAddresses,
    message: hasDifferentExit
      ? "WebRTC 的 UDP 出口与网页出口不同，请结合代理规则判断是否泄露。"
      : baseline.size > 0
        ? "WebRTC 的公网 UDP 出口与网页出口一致。"
        : "已取得 WebRTC 公网 UDP 出口，请先查询我的 IP 以进行对比。",
  }
}
