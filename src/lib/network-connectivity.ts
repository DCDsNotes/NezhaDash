import { createTimeoutSignal, delay, runConcurrent } from "@/lib/async"
import { getSiteLogoUrl } from "@/lib/network-diagnostics"

export type ConnectivityRegionId = "jp" | "us" | "global"
export type ConnectivityState = "idle" | "running" | "success" | "error"
export type ConnectivityLatencyLevel = "fast" | "normal" | "slow" | "timeout" | "pending"

export interface ConnectivityRegion {
  id: ConnectivityRegionId
  label: string
  countryCode?: string
}

export interface ConnectivityTarget {
  id: string
  name: string
  region: ConnectivityRegionId
  url: string
  fallbackUrl?: string
  logoUrl: string
}

export interface ConnectivityResult extends ConnectivityTarget {
  state: ConnectivityState
  samples: Array<number | null>
  latency?: number
}

export const CONNECTIVITY_PROBE_ROUNDS = 5
const CONNECTIVITY_PROBE_CONCURRENCY = 10
const CONNECTIVITY_PROBE_TIMEOUT = 2_500

export const CONNECTIVITY_REGIONS: ConnectivityRegion[] = [
  { id: "jp", label: "日本", countryCode: "JP" },
  { id: "us", label: "美国", countryCode: "US" },
  { id: "global", label: "全球" },
]

function target(
  region: ConnectivityRegionId,
  id: string,
  name: string,
  domain: string,
  url = `https://${domain}/favicon.ico`,
  fallbackUrl = `https://${domain}/`,
): ConnectivityTarget {
  return { id, name, region, url, fallbackUrl, logoUrl: getSiteLogoUrl(domain) }
}

export const CONNECTIVITY_TARGETS: ConnectivityTarget[] = [
  target("jp", "sony", "Sony", "www.sony.jp"),
  target("jp", "nintendo", "任天堂", "www.nintendo.co.jp"),
  target("jp", "yahoo-jp", "Yahoo! JP", "www.yahoo.co.jp"),
  target("jp", "line", "LINE", "line.me"),

  target("us", "apple", "Apple", "www.apple.com"),
  target("us", "google", "Google", "www.google.com", "https://www.google.com/generate_204"),
  target("us", "youtube", "YouTube", "www.youtube.com", "https://www.youtube.com/generate_204"),
  target("us", "github", "GitHub", "github.com", "https://github.com/generate_204"),
  target("us", "cloudflare", "Cloudflare", "www.cloudflare.com", "https://1.1.1.1/cdn-cgi/trace"),
  target("us", "claude", "Claude", "claude.ai", "https://api.anthropic.com/favicon.ico"),
  target("us", "chatgpt", "ChatGPT", "chatgpt.com", "https://chatgpt.com/cdn-cgi/trace"),
  target("us", "ai-studio", "AI Studio", "aistudio.google.com", "https://generativelanguage.googleapis.com/favicon.ico"),
  target("us", "amazon", "Amazon", "www.amazon.com"),
  target("us", "bing", "Bing", "www.bing.com", "https://www.bing.com/favicon.ico"),
  target("us", "steam", "Steam", "store.steampowered.com"),
  target("us", "oracle", "Oracle", "www.oracle.com"),
  target("us", "zoom", "Zoom", "zoom.us", "https://st1.zoom.us/favicon.ico"),
  target("us", "facebook", "Facebook", "www.facebook.com", "https://static.xx.fbcdn.net/rsrc.php/yb/r/hLRJ1GG_y0J.ico"),
  target("us", "instagram", "Instagram", "www.instagram.com", "https://static.cdninstagram.com/rsrc.php/yb/r/hLRJ1GG_y0J.ico"),
  target("us", "x", "X", "x.com", "https://abs.twimg.com/favicons/twitter.3.ico"),
  target("us", "reddit", "Reddit", "www.reddit.com"),
  target("us", "linkedin", "LinkedIn", "www.linkedin.com", "https://static.licdn.com/favicon.ico"),
  target("us", "twitch", "Twitch", "www.twitch.tv", "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png"),
  target("us", "netflix", "Netflix", "www.netflix.com", "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico"),

  target("global", "tiktok", "TikTok", "www.tiktok.com"),
  target("global", "spotify", "Spotify", "open.spotify.com"),
  target("global", "npm", "npm", "www.npmjs.com", "https://registry.npmjs.org/"),
  target("global", "takealot", "Takealot", "www.takealot.com", "https://static.takealot.com/favicon.ico"),
  target("global", "pixpix", "PixPix", "www.pixpix.com"),
  target("global", "naver", "Naver", "www.naver.com"),
  target("global", "noon", "Noon", "www.noon.com", "https://www.noon.com/favicon.ico", "https://f.nooncdn.com/"),
  target("global", "wikipedia", "Wikipedia", "www.wikipedia.org", "https://www.wikipedia.org/static/favicon/wikipedia.ico"),
  target("global", "bbc", "BBC", "www.bbc.com"),
  target("global", "mistral", "Mistral AI", "mistral.ai"),
  target("global", "yandex", "Yandex", "yandex.com", "https://yastatic.net/favicon.ico"),
  target("global", "mercado-libre", "MercadoLibre", "www.mercadolibre.com", "https://http2.mlstatic.com/favicon.ico"),
]

export function createConnectivityResults() {
  return CONNECTIVITY_TARGETS.map<ConnectivityResult>((item) => ({ ...item, state: "idle", samples: [] }))
}

export function getConnectivityLatencyLevel(latency?: number | null): ConnectivityLatencyLevel {
  if (latency === null) return "timeout"
  if (latency === undefined) return "pending"
  if (latency < 100) return "fast"
  if (latency < 400) return "normal"
  return "slow"
}

async function probeOnce(url: string, parentSignal: AbortSignal) {
  const request = createTimeoutSignal(parentSignal, CONNECTIVITY_PROBE_TIMEOUT)
  const startedAt = performance.now()

  try {
    await fetch(url, {
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: request.signal,
    })
    return Math.round(performance.now() - startedAt)
  } catch (error) {
    if (parentSignal.aborted) throw error
    return null
  } finally {
    request.dispose()
  }
}

function median(values: number[]) {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

async function checkConnectivityTarget(item: ConnectivityTarget, signal: AbortSignal): Promise<ConnectivityResult> {
  const samples: Array<number | null> = []
  let probeUrl = item.url
  const primaryWarmup = await probeOnce(probeUrl, signal)
  if (primaryWarmup === null && item.fallbackUrl && item.fallbackUrl !== probeUrl) {
    const fallbackWarmup = await probeOnce(item.fallbackUrl, signal)
    if (fallbackWarmup !== null) probeUrl = item.fallbackUrl
  }

  for (let round = 0; round < CONNECTIVITY_PROBE_ROUNDS; round += 1) {
    samples.push(await probeOnce(probeUrl, signal))
    if (round < CONNECTIVITY_PROBE_ROUNDS - 1) await delay(90 + Math.random() * 140, signal)
  }

  const latency = median(samples.filter((sample): sample is number => sample !== null))
  return { ...item, samples, latency, state: latency === undefined ? "error" : "success" }
}

export async function checkConnectivityTargets(targets: ConnectivityTarget[], signal: AbortSignal, onResult: (result: ConnectivityResult) => void) {
  return runConcurrent(targets, CONNECTIVITY_PROBE_CONCURRENCY, signal, (item) => checkConnectivityTarget(item, signal), onResult)
}
