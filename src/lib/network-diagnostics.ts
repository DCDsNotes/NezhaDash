export type DiagnosticState = "idle" | "running" | "success" | "warning" | "error"

export interface SplitTarget {
  id: string
  label: string
  category: string
  url: string
}

export interface SplitResult extends SplitTarget {
  state: Exclude<DiagnosticState, "warning">
  ip?: string
  location?: string
  duration?: number
  message?: string
}

export interface DnsResolver {
  ip: string
  provider?: string
  location?: string
}

export interface DnsLeakResult {
  resolvers: DnsResolver[]
  complete: boolean
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
}

declare global {
  interface Window {
    NetworkDiagnosticsConfig?: NetworkDiagnosticsRuntimeConfig
  }
}

const DEFAULT_SPLIT_TARGETS: SplitTarget[] = [
  {
    id: "cloudflare-cn",
    label: "Cloudflare 中国",
    category: "中国站点",
    url: "https://www.cloudflare-cn.com/cdn-cgi/trace",
  },
  {
    id: "qualcomm-cn",
    label: "高通中国",
    category: "中国站点",
    url: "https://www.qualcomm.cn/cdn-cgi/trace",
  },
  {
    id: "cloudflare-global",
    label: "Cloudflare",
    category: "国际站点",
    url: "https://www.cloudflare.com/cdn-cgi/trace",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    category: "国际站点",
    url: "https://chatgpt.com/cdn-cgi/trace",
  },
]

const REQUEST_TIMEOUT = 7_000
const MAX_CUSTOM_TARGETS = 12
const DEFAULT_STUN_URLS = ["stun:stun.cloudflare.com:3478"]

function isSafeHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

function normaliseAddress(value: string) {
  return value.trim().replace(/^\[|\]$/g, "").toLowerCase()
}

function sanitiseSplitTargets(targets: NetworkDiagnosticsRuntimeConfig["splitTargets"]): SplitTarget[] {
  if (!Array.isArray(targets)) return []

  return targets.slice(0, MAX_CUSTOM_TARGETS).flatMap((target, index) => {
    const label = target.label?.trim().slice(0, 36)
    const url = target.url?.trim()
    if (!label || !url || !isSafeHttpsUrl(url)) return []

    return [
      {
        id: `${target.id?.trim().slice(0, 40) || "custom"}-${index + 1}`,
        label,
        category: target.category?.trim().slice(0, 20) || "自定义站点",
        url,
      },
    ]
  })
}

export function getSplitTargets() {
  const configured = sanitiseSplitTargets(window.NetworkDiagnosticsConfig?.splitTargets)
  return configured.length > 0 ? configured : DEFAULT_SPLIT_TARGETS
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

function parseTrace(text: string) {
  const fields = new Map(
    text
      .slice(0, 8_192)
      .split(/\r?\n/)
      .map((line) => line.split(/=(.*)/s).slice(0, 2))
      .filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0])),
  )

  const ip = fields.get("ip")?.trim().slice(0, 64)
  return {
    ip: ip && /^[0-9a-f:.]+$/i.test(ip) ? ip : undefined,
    location: fields.get("loc")?.trim().toUpperCase().slice(0, 8),
  }
}

export async function checkSplitTarget(target: SplitTarget, parentSignal: AbortSignal): Promise<SplitResult> {
  const startedAt = performance.now()
  const request = withTimeout(parentSignal)

  try {
    const response = await fetch(target.url, {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: request.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const trace = parseTrace(await response.text())
    if (!trace.ip) throw new Error("响应中没有出口 IP")

    return {
      ...target,
      ...trace,
      state: "success",
      duration: Math.round(performance.now() - startedAt),
    }
  } catch (error) {
    if (parentSignal.aborted) throw error
    return {
      ...target,
      state: "error",
      duration: Math.round(performance.now() - startedAt),
      message: error instanceof Error ? error.message : "请求失败",
    }
  } finally {
    request.dispose()
  }
}

export async function checkSplitTargets(
  targets: SplitTarget[],
  signal: AbortSignal,
  onResult: (result: SplitResult) => void,
) {
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

  await Promise.all(Array.from({ length: Math.min(2, targets.length) }, () => worker()))
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

export async function checkDnsLeak(endpoint: string, signal: AbortSignal): Promise<DnsLeakResult> {
  const started = await postJson<DnsStartResponse>(endpoint, { action: "start" }, signal)
  if (!started.sessionId) throw new Error("DNS 检测服务未返回会话标识")

  const probeUrls = (started.probeUrls || []).filter(isSafeHttpsUrl).slice(0, 8)
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
    const result = await postJson<DnsLeakResult>(endpoint, { action: "result", sessionId: started.sessionId }, signal)
    if (result.complete || result.resolvers?.length) {
      const resolvers = Array.isArray(result.resolvers)
        ? result.resolvers.slice(0, 12).flatMap((resolver) => {
            const ip = typeof resolver?.ip === "string" ? resolver.ip.trim().slice(0, 64) : ""
            if (!ip || !/^[0-9a-f:.]+$/i.test(ip)) return []
            return [
              {
                ip,
                provider: typeof resolver.provider === "string" ? resolver.provider.trim().slice(0, 80) : undefined,
                location: typeof resolver.location === "string" ? resolver.location.trim().slice(0, 80) : undefined,
              },
            ]
          })
        : []
      return { resolvers, complete: Boolean(result.complete) }
    }
  }

  return { resolvers: [], complete: false }
}

function isPrivateAddress(value: string) {
  const address = normaliseAddress(value)
  if (address.endsWith(".local")) return true
  if (address === "::1" || address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true

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
  if (!address) return null
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
        // Some networks block UDP. The timeout path still returns a useful neutral result.
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
        : "未发现可对比的公网候选，WebRTC 可能已受保护或当前网络阻止了 UDP。",
    }
  }

  const hasDifferentExit = baseline.size > 0 && publicAddresses.some((address) => !baseline.has(address))
  return {
    state: hasDifferentExit || exposesPrivateAddress ? "warning" : "success",
    candidates: list,
    publicAddresses,
    message: hasDifferentExit
      ? "WebRTC 的 UDP 出口与网页出口不同，可能是预期分流，也可能存在泄露，请结合代理规则判断。"
      : baseline.size > 0
        ? "WebRTC 的公网 UDP 出口与网页出口一致。"
        : "已取得 WebRTC 公网 UDP 出口，请先运行 IP 分流以进行对比。",
  }
}
