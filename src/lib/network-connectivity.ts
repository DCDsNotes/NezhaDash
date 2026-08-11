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

function target(region: ConnectivityRegionId, id: string, name: string, domain: string, url = `https://${domain}/favicon.ico`): ConnectivityTarget {
  return { id, name, region, url, logoUrl: getSiteLogoUrl(domain) }
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
  target("global", "noon", "Noon", "www.noon.com"),
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

function wait(duration: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }

    let timer = 0
    const abort = () => {
      window.clearTimeout(timer)
      reject(signal.reason)
    }
    timer = window.setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, duration)
    signal.addEventListener("abort", abort, { once: true })
  })
}

async function probeOnce(url: string, parentSignal: AbortSignal) {
  if (/\.(?:gif|ico|jpe?g|png|svg|webp)$/i.test(new URL(url).pathname)) return probeImageOnce(url, parentSignal)

  const controller = new AbortController()
  const abort = () => controller.abort()
  const timer = window.setTimeout(abort, CONNECTIVITY_PROBE_TIMEOUT)
  const startedAt = performance.now()

  if (parentSignal.aborted) abort()
  else parentSignal.addEventListener("abort", abort, { once: true })

  try {
    await fetch(url, {
      mode: "no-cors",
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    })
    return Math.round(performance.now() - startedAt)
  } catch (error) {
    if (parentSignal.aborted) throw error
    return null
  } finally {
    window.clearTimeout(timer)
    parentSignal.removeEventListener("abort", abort)
  }
}

function probeImageOnce(url: string, parentSignal: AbortSignal) {
  return new Promise<number | null>((resolve, reject) => {
    const image = new Image()
    const startedAt = performance.now()
    let settled = false
    let timer = 0

    const cleanup = () => {
      window.clearTimeout(timer)
      parentSignal.removeEventListener("abort", abort)
      image.onload = null
      image.onerror = null
    }
    const finish = (latency: number | null) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(latency)
    }
    const abort = () => {
      if (settled) return
      settled = true
      cleanup()
      image.removeAttribute("src")
      reject(parentSignal.reason)
    }

    if (parentSignal.aborted) {
      abort()
      return
    }

    parentSignal.addEventListener("abort", abort, { once: true })
    timer = window.setTimeout(() => finish(null), CONNECTIVITY_PROBE_TIMEOUT)
    image.onload = () => finish(Math.round(performance.now() - startedAt))
    image.onerror = () => finish(null)
    image.referrerPolicy = "no-referrer"

    const requestUrl = new URL(url)
    requestUrl.searchParams.set("nezha_probe", `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    image.src = requestUrl.href
  })
}

function median(values: number[]) {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

async function checkConnectivityTarget(item: ConnectivityTarget, signal: AbortSignal): Promise<ConnectivityResult> {
  const samples: Array<number | null> = []
  for (let round = 0; round < CONNECTIVITY_PROBE_ROUNDS; round += 1) {
    samples.push(await probeOnce(item.url, signal))
    if (round < CONNECTIVITY_PROBE_ROUNDS - 1) await wait(60 + Math.random() * 100, signal)
  }

  const latency = median(samples.filter((sample): sample is number => sample !== null))
  return { ...item, samples, latency, state: latency === undefined ? "error" : "success" }
}

export async function checkConnectivityTargets(targets: ConnectivityTarget[], signal: AbortSignal, onResult: (result: ConnectivityResult) => void) {
  const results = new Array<ConnectivityResult>(targets.length)
  let nextIndex = 0

  async function worker() {
    while (!signal.aborted) {
      const index = nextIndex++
      const item = targets[index]
      if (!item) return
      const result = await checkConnectivityTarget(item, signal)
      results[index] = result
      onResult(result)
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONNECTIVITY_PROBE_CONCURRENCY, targets.length) }, () => worker()))
  return results.filter(Boolean)
}
