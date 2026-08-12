import ServerFlag from "@/components/ServerFlag"
import AiDiagnosticsPanel from "@/components/network/AiDiagnosticsPanel"
import { Switch } from "@/components/ui/switch"
import { AI_SERVICE_PROFILES, type AiDeviceInfo, getAiDeviceInfo } from "@/lib/ai-diagnostics"
import {
  CONNECTIVITY_PROBE_ROUNDS,
  CONNECTIVITY_REGIONS,
  CONNECTIVITY_TARGETS,
  type ConnectivityRegion,
  type ConnectivityRegionId,
  type ConnectivityResult,
  checkConnectivityTargets,
  createConnectivityResults,
  getConnectivityLatencyLevel,
} from "@/lib/network-connectivity"
import {
  type DiagnosticState,
  type DnsLeakResult,
  type AiRiskResult,
  type AiServiceId,
  type PublicIpResult,
  type SplitMode,
  type SplitTarget,
  type SplitResult,
  type WebRtcCandidate,
  type WebRtcResult,
  checkDnsLeak,
  checkAiRisk,
  checkPublicIp,
  checkSplitTargets,
  checkWebRtcLeak,
  formatGeolocation,
  getCachedPublicIp,
  getCachedSplitResults,
  getDnsEndpoint,
  getSplitTargets,
} from "@/lib/network-diagnostics"
import "@/styles/network-diagnostics.css"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

type CheckState<T> = {
  state: DiagnosticState
  result?: T
  message?: string
}

type DiagnosticTab = "split" | "connectivity" | "leaks" | "ai"

const DIAGNOSTIC_TABS: Array<{ id: DiagnosticTab; label: string; icon: string }> = [
  { id: "split", label: "网站分流", icon: "ri-route-line" },
  { id: "connectivity", label: "网络连通性", icon: "ri-wifi-line" },
  { id: "leaks", label: "泄露检测", icon: "ri-shield-keyhole-line" },
  { id: "ai", label: "AI 检测", icon: "ri-sparkling-2-line" },
]

const STATUS_ICONS: Record<DiagnosticState, string> = {
  idle: "ri-pulse-line",
  running: "ri-loader-4-line",
  success: "ri-check-line",
  warning: "ri-error-warning-line",
  error: "ri-close-line",
}

const WEBRTC_TYPE_LABELS: Record<string, string> = {
  host: "本机候选",
  srflx: "STUN 公网候选",
  relay: "TURN 中继候选",
  prflx: "对端反射候选",
}

const AI_TARGET_IDS = new Set(Object.values(AI_SERVICE_PROFILES).flatMap((profile) => profile.targetIds))

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") return "请求已取消"
  if (error instanceof Error && /abort(?:ed)?(?: without reason)?/i.test(error.message)) return "请求已取消"
  return error instanceof Error && error.message ? error.message : fallback
}

function isChinaLocation(value?: string) {
  return Boolean(value && /中国|China|大陆|内地/i.test(value))
}

function isPossibleDnsLeak(publicLocation?: string, resolverLocation?: string) {
  return Boolean(publicLocation) && !isChinaLocation(publicLocation) && isChinaLocation(resolverLocation)
}

function maskAddress(value: string) {
  if (value.includes(":")) {
    const parts = value.split(":")
    return `${parts.slice(0, 3).join(":")}:****:****`
  }
  const parts = value.split(".")
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : value
}

function StatusLabel({ state, children }: { state: DiagnosticState; children: React.ReactNode }) {
  return (
    <span className={`network-diagnostics__status network-diagnostics__status--${state}`} role="status">
      <i className={STATUS_ICONS[state]} aria-hidden="true" />
      {children}
    </span>
  )
}

function ActionButton({
  children,
  disabled,
  primary,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  primary?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`network-diagnostics__button${primary ? " network-diagnostics__button--primary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

type DiagnosticBlockProps = {
  id: string
  title: string
  description: string
  status: React.ReactNode
  actions: React.ReactNode
  children: React.ReactNode
}

function DiagnosticBlock({ className, id, title, description, status, actions, children }: DiagnosticBlockProps & { className: string }) {
  return (
    <section className={className} aria-labelledby={id}>
      <header className="network-diagnostics__section-header">
        <div className="network-diagnostics__section-copy">
          <h2 id={id}>{title}</h2>
          <p>{description}</p>
          {status}
        </div>
        <div className="network-diagnostics__section-actions">{actions}</div>
      </header>
      {children}
    </section>
  )
}

function DiagnosticSection(props: DiagnosticBlockProps) {
  return <DiagnosticBlock {...props} className="network-diagnostics__card" />
}

function DiagnosticSubsection(props: DiagnosticBlockProps) {
  return <DiagnosticBlock {...props} className="network-diagnostics__subsection" />
}

function EmptyResult({ children }: { children: React.ReactNode }) {
  return <div className="network-diagnostics__empty">{children}</div>
}

function IpMaskToggle({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="network-diagnostics__mask-toggle">
      <span>隐藏 IP</span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label="隐藏 IP"
        className="network-diagnostics__mask-switch"
        thumbClassName="network-diagnostics__mask-switch-thumb"
      />
    </div>
  )
}

function SiteLogo({ label, logoUrl, fallbackUrl, ready }: { label: string; logoUrl?: string; fallbackUrl?: string; ready: boolean }) {
  return (
    <span className="network-diagnostics__site-logo" aria-hidden="true">
      <span>{label.slice(0, 1).toUpperCase()}</span>
      {ready && logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          width="22"
          height="22"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          referrerPolicy="no-referrer"
          onError={(event) => {
            if (fallbackUrl && event.currentTarget.dataset.fallback !== "true") {
              event.currentTarget.dataset.fallback = "true"
              event.currentTarget.src = fallbackUrl
              return
            }
            event.currentTarget.hidden = true
          }}
        />
      ) : null}
    </span>
  )
}

function getOriginFavicon(url: string) {
  try {
    return `${new URL(url).origin}/favicon.ico`
  } catch {
    return undefined
  }
}

function CountryFlag({ countryCode }: { countryCode?: string }) {
  if (!countryCode || !/^[A-Z]{2}$/i.test(countryCode)) {
    return <i className="ri-global-line network-diagnostics__country-placeholder" aria-hidden="true" />
  }
  return <ServerFlag country_code={countryCode} className="network-diagnostics__country-flag" />
}

function formatSplitAddress(result: SplitResult, masked: boolean) {
  if (!result.ip) return result.state === "running" ? "检测中" : "-"
  const address = masked ? maskAddress(result.ip) : result.ip
  return result.ipPrefix === undefined ? address : `${address}/${result.ipPrefix}`
}

function SplitResultStatus({ result }: { result: SplitResult }) {
  if (result.state === "running") return <StatusLabel state="running">连接中</StatusLabel>
  if (result.state === "error") return <StatusLabel state="error">{result.message || "失败"}</StatusLabel>
  if (result.method !== "google-dns") return <StatusLabel state="success">{result.duration} ms</StatusLabel>
  if (!result.countryCode) return <StatusLabel state="warning">无法判断</StatusLabel>
  return result.countryCode === "CN" ? <StatusLabel state="warning">定位中国</StatusLabel> : <StatusLabel state="success">非中国定位</StatusLabel>
}

function SplitTableSkeleton({ targets }: { targets: SplitTarget[] }) {
  return (
    <div className="network-diagnostics__table network-diagnostics__table--split network-diagnostics__split-skeleton" role="presentation" aria-hidden="true">
      <div className="network-diagnostics__table-head" role="row">
        <span>网站</span>
        <span>类型</span>
        <span>出口 IP</span>
        <span>Geolocation</span>
        <span>状态</span>
      </div>
      {targets.map((target) => (
        <div className="network-diagnostics__table-row" role="row" key={target.id}>
          <div className="network-diagnostics__site">
            <span className="network-diagnostics__skeleton network-diagnostics__skeleton--logo" />
            <span className="network-diagnostics__skeleton network-diagnostics__skeleton--site" />
          </div>
          <span className="network-diagnostics__skeleton network-diagnostics__skeleton--category" />
          <span className="network-diagnostics__skeleton network-diagnostics__skeleton--address" />
          <span className="network-diagnostics__skeleton network-diagnostics__skeleton--location" />
          <span className="network-diagnostics__skeleton network-diagnostics__skeleton--status" />
        </div>
      ))}
    </div>
  )
}

function AiDetectionSkeleton() {
  return (
    <div className="network-diagnostics__ai-dashboard network-diagnostics__ai-dashboard--skeleton" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <article className={`network-diagnostics__ai-panel-card${index === 6 ? " network-diagnostics__ai-device-card" : ""}`} key={index}>
          <span className="network-diagnostics__skeleton network-diagnostics__skeleton--ai-title" />
          {Array.from({ length: index === 6 ? 10 : index === 1 ? 6 : index < 3 ? 5 : 3 }, (__, row) => (
            <span className="network-diagnostics__skeleton network-diagnostics__skeleton--ai-row" key={row} />
          ))}
        </article>
      ))}
    </div>
  )
}

function hasExactSplitIp(result: SplitResult): result is SplitResult & { ip: string; state: "success" } {
  return result.state === "success" && Boolean(result.ip) && result.ipPrefix === undefined
}

function getConnectivityRegionSummary(results: ConnectivityResult[]) {
  const completed = results.filter((result) => result.state === "success" || result.state === "error")
  const reachable = completed.filter((result) => result.state === "success")
  if (completed.length === 0) return results.some((result) => result.state === "running") ? `已完成 0/${results.length}` : "等待测试"
  if (completed.length < results.length) return `已完成 ${completed.length}/${results.length}`
  if (reachable.length === 0) return `可达 0/${results.length}`

  const average = Math.round(reachable.reduce((total, result) => total + (result.latency || 0), 0) / reachable.length)
  return `可达 ${reachable.length}/${results.length}，平均 ${average} ms`
}

function getConnectivityResultLevel(result: ConnectivityResult) {
  return result.state === "error" ? "timeout" : getConnectivityLatencyLevel(result.latency)
}

function ConnectivityRegionPanel({
  region,
  results,
  disabled,
  onRetest,
}: {
  region: ConnectivityRegion
  results: ConnectivityResult[]
  disabled: boolean
  onRetest: (region: ConnectivityRegionId) => void
}) {
  return (
    <section className="network-diagnostics__connectivity-region" aria-labelledby={`connectivity-region-${region.id}`}>
      <header className="network-diagnostics__connectivity-region-header">
        {region.countryCode ? (
          <CountryFlag countryCode={region.countryCode} />
        ) : (
          <i className="ri-global-line network-diagnostics__connectivity-globe" aria-hidden="true" />
        )}
        <h3 id={`connectivity-region-${region.id}`}>{region.label}</h3>
        <span>{getConnectivityRegionSummary(results)}</span>
        <button
          type="button"
          className={results.some((result) => result.state === "running") ? "network-diagnostics__connectivity-refresh--running" : undefined}
          disabled={disabled}
          onClick={() => onRetest(region.id)}
          aria-label={`重新测试${region.label}连通性`}
        >
          <i className="ri-refresh-line" aria-hidden="true" />
          刷新
        </button>
      </header>
      <div className="network-diagnostics__connectivity-grid" role="list">
        {results.map((result) => (
          <div className="network-diagnostics__connectivity-item" role="listitem" key={result.id}>
            <SiteLogo label={result.name} logoUrl={result.logoUrl} fallbackUrl={getOriginFavicon(result.url)} ready={result.state !== "idle"} />
            <div className="network-diagnostics__connectivity-copy">
              <strong title={result.name}>{result.name}</strong>
              <span className="network-diagnostics__connectivity-samples" aria-label={`${result.name} 测试样本`}>
                {Array.from({ length: CONNECTIVITY_PROBE_ROUNDS }, (_, index) => {
                  const sample = result.samples[index]
                  const level = getConnectivityLatencyLevel(sample)
                  return (
                    <i
                      className={`network-diagnostics__connectivity-sample network-diagnostics__connectivity-sample--${level}`}
                      title={sample === null ? "超时" : sample === undefined ? "等待测试" : `${sample} ms`}
                      key={index}
                    />
                  )
                })}
              </span>
            </div>
            <span
              className={`network-diagnostics__connectivity-latency network-diagnostics__connectivity-latency--${getConnectivityResultLevel(result)}`}
            >
              {result.state === "running"
                ? "测试中"
                : result.state === "error"
                  ? "超时"
                  : result.latency === undefined
                    ? "--"
                    : `${result.latency} ms`}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function WebRtcStatus({ candidate, baseline }: { candidate: WebRtcCandidate; baseline: Set<string> }) {
  if (candidate.address.endsWith(".local")) return <StatusLabel state="success">地址已保护</StatusLabel>
  if (candidate.private) return <StatusLabel state="warning">可能泄露</StatusLabel>
  if (baseline.size > 0 && !baseline.has(candidate.address)) return <StatusLabel state="warning">出口不同</StatusLabel>
  return <StatusLabel state="success">正常</StatusLabel>
}

export default function NetworkDiagnostics() {
  const allTargets = useMemo(() => getSplitTargets("full"), [])
  const coreTargets = useMemo(() => getSplitTargets("core"), [])
  const aiTargets = useMemo(() => allTargets.filter((target) => AI_TARGET_IDS.has(target.id)), [allTargets])
  const dnsEndpoint = useMemo(getDnsEndpoint, [])
  const cachedPublicIp = useMemo(getCachedPublicIp, [])
  const cachedSplitResults = useMemo(getCachedSplitResults, [])
  const controllers = useRef(new Set<AbortController>())
  const publicIpTask = useRef<Promise<PublicIpResult | null> | null>(null)
  const splitTask = useRef<Promise<SplitResult[]> | null>(null)
  const aiTask = useRef<Promise<SplitResult[]> | null>(null)
  const aiRiskTask = useRef<Promise<void> | null>(null)
  const connectivityTask = useRef<Promise<ConnectivityResult[]> | null>(null)
  const dnsTask = useRef<Promise<DnsLeakResult | null> | null>(null)
  const webRtcTask = useRef<Promise<WebRtcResult | null> | null>(null)
  const [publicIp, setPublicIp] = useState<CheckState<PublicIpResult>>(
    cachedPublicIp ? { state: "success", result: cachedPublicIp, message: "已读取本次会话缓存" } : { state: "idle" },
  )
  const [maskIp, setMaskIp] = useState(false)
  const [activeTab, setActiveTab] = useState<DiagnosticTab>("split")
  const [splitMode, setSplitMode] = useState<SplitMode>(cachedSplitResults.length > coreTargets.length ? "full" : "core")
  const [splitResults, setSplitResults] = useState<SplitResult[]>(cachedSplitResults)
  const [splitRunning, setSplitRunning] = useState(false)
  const [aiResults, setAiResults] = useState<SplitResult[]>(cachedSplitResults.filter((result) => AI_TARGET_IDS.has(result.id)))
  const [aiRunning, setAiRunning] = useState(false)
  const [aiService, setAiService] = useState<AiServiceId>("claude")
  const [aiRisks, setAiRisks] = useState<Partial<Record<AiServiceId, AiRiskResult>>>({})
  const [aiRiskStates, setAiRiskStates] = useState<Partial<Record<AiServiceId, DiagnosticState>>>({})
  const [aiDevice, setAiDevice] = useState<AiDeviceInfo | null>(null)
  const [connectivityResults, setConnectivityResults] = useState(createConnectivityResults)
  const [connectivityRunning, setConnectivityRunning] = useState(false)
  const [dns, setDns] = useState<CheckState<DnsLeakResult>>({ state: "idle" })
  const [webRtc, setWebRtc] = useState<CheckState<WebRtcResult>>({ state: "idle" })

  useEffect(() => {
    if (!cachedPublicIp) void runPublicIp(false)
  }, [cachedPublicIp])

  useEffect(() => {
    return () => {
      controllers.current.forEach((controller) => controller.abort())
      controllers.current.clear()
    }
  }, [])

  useEffect(() => {
    if (activeTab === "ai" && !aiDevice) setAiDevice(getAiDeviceInfo())
  }, [activeTab, aiDevice])

  function runAi(force = false) {
    if (aiTask.current || aiTargets.length === 0) return aiTask.current || Promise.resolve([])

    const cachedById = new Map(getCachedSplitResults().filter((result) => AI_TARGET_IDS.has(result.id)).map((result) => [result.id, result]))
    const cachedResults = aiTargets.flatMap((target) => {
      const result = cachedById.get(target.id)
      return result && !force ? [result] : []
    })
    const targets = force ? aiTargets : aiTargets.filter((target) => !cachedById.has(target.id))
    if (targets.length === 0) {
      setAiResults(cachedResults)
      return runAiRisks(cachedResults, force).then(() => cachedResults)
    }

    const task = (async () => {
      setAiRunning(true)
      setAiResults(
        aiTargets.map((target) => cachedById.get(target.id) ?? { ...target, state: "running" }),
      )
      try {
        const freshResults = await runAbortable((signal) =>
          checkSplitTargets(targets, signal, (result) => {
            setAiResults((current) => current.map((item) => (item.id === result.id ? result : item)))
          }),
        )
        const combinedResults = [...cachedResults, ...freshResults]
        await runAiRisks(combinedResults, force)
        return combinedResults
      } catch (error) {
        setAiResults((current) =>
          current.map((result) => (result.state === "running" ? { ...result, state: "error", message: getErrorMessage(error, "AI 检测失败") } : result)),
        )
        return []
      } finally {
        setAiRunning(false)
        aiTask.current = null
      }
    })()

    aiTask.current = task
    return task
  }

  function runAiRisks(results: SplitResult[], force = false) {
    if (aiRiskTask.current) return aiRiskTask.current
    const task = (async () => {
      const serviceEntries = (Object.entries(AI_SERVICE_PROFILES) as Array<[AiServiceId, (typeof AI_SERVICE_PROFILES)[AiServiceId]]>).flatMap(
        ([serviceId, profile]) => {
          const result = results.find((item) => item.id === profile.primaryTargetId && item.state === "success" && item.ip)
          return result?.ip ? [{ serviceId, ip: result.ip }] : []
        },
      )
      if (serviceEntries.length === 0) return
      setAiRiskStates((current) => Object.assign({}, current, ...serviceEntries.map(({ serviceId }) => ({ [serviceId]: "running" as const }))))
      const settled = await Promise.allSettled(
        serviceEntries.map(async ({ serviceId, ip }) => ({ serviceId, result: await runAbortable((signal) => checkAiRisk(ip, signal, force)) })),
      )
      const successful = settled.flatMap((entry) => (entry.status === "fulfilled" ? [entry.value] : []))
      setAiRisks((current) => Object.assign({}, current, ...successful.map(({ serviceId, result }) => ({ [serviceId]: result }))))
      setAiRiskStates((current) =>
        Object.assign(
          {},
          current,
          ...settled.map((entry, index) => ({
            [serviceEntries[index].serviceId]: entry.status === "fulfilled" ? "success" : "error",
          })),
        ),
      )
    })().finally(() => {
      aiRiskTask.current = null
    })
    aiRiskTask.current = task
    return task
  }

  async function runAbortable<T>(task: (signal: AbortSignal) => Promise<T>) {
    const controller = new AbortController()
    controllers.current.add(controller)
    try {
      return await task(controller.signal)
    } finally {
      controllers.current.delete(controller)
    }
  }

  function runPublicIp(force = true) {
    if (publicIpTask.current) return publicIpTask.current

    const task = (async () => {
      setPublicIp((current) => ({ state: "running", result: current.result }))
      try {
        const result = await runAbortable((signal) => checkPublicIp(signal, force))
        setPublicIp({ state: "success", result, message: "查询完成" })
        return result
      } catch (error) {
        setPublicIp((current) => ({ state: "error", result: current.result, message: getErrorMessage(error, "IP 查询失败") }))
        return null
      } finally {
        publicIpTask.current = null
      }
    })()

    publicIpTask.current = task
    return task
  }

  function runSplit(mode: SplitMode) {
    if (splitTask.current) return splitTask.current
    const targets = mode === "full" ? allTargets : coreTargets

    const task = (async () => {
      setSplitMode(mode)
      setSplitRunning(true)
      setSplitResults(targets.map((target) => ({ ...target, state: "running" })))
      try {
        return await runAbortable((signal) =>
          checkSplitTargets(targets, signal, (result) => {
            setSplitResults((current) => current.map((item) => (item.id === result.id ? result : item)))
          }),
        )
      } catch (error) {
        setSplitResults((current) =>
          current.map((item) => (item.state === "running" ? { ...item, state: "error", message: getErrorMessage(error, "检测失败") } : item)),
        )
        return []
      } finally {
        setSplitRunning(false)
        splitTask.current = null
      }
    })()

    splitTask.current = task
    return task
  }

  function runConnectivity(region?: ConnectivityRegionId) {
    if (connectivityTask.current) return connectivityTask.current
    const targets = region ? CONNECTIVITY_TARGETS.filter((target) => target.region === region) : CONNECTIVITY_TARGETS
    const targetIds = new Set(targets.map((target) => target.id))

    const task = (async () => {
      setConnectivityRunning(true)
      setConnectivityResults((current) =>
        current.map((result) => (targetIds.has(result.id) ? { ...result, state: "running", samples: [], latency: undefined } : result)),
      )
      try {
        return await runAbortable((signal) =>
          checkConnectivityTargets(targets, signal, (result) => {
            setConnectivityResults((current) => current.map((item) => (item.id === result.id ? result : item)))
          }),
        )
      } catch {
        setConnectivityResults((current) =>
          current.map((result) => (targetIds.has(result.id) && result.state === "running" ? { ...result, state: "error", samples: [] } : result)),
        )
        return []
      } finally {
        setConnectivityRunning(false)
        connectivityTask.current = null
      }
    })()

    connectivityTask.current = task
    return task
  }

  function runDns(rounds: 5 | 8) {
    if (dnsTask.current) return dnsTask.current

    const task = (async () => {
      setDns({ state: "running", message: `正在执行 ${rounds} 次解析探测` })
      try {
        const result = await runAbortable((signal) => checkDnsLeak(dnsEndpoint, rounds, signal))
        const possibleLeak = result.resolvers.some((resolver) => isPossibleDnsLeak(publicIp.result?.location, resolver.location))
        const message =
          result.resolvers.length === 0
            ? "未检测到 DNS 解析器，可能使用了加密 DNS 或当前网络阻止了探测。"
            : possibleLeak
              ? "网页出口位于境外，但检测到了中国大陆 DNS 解析器，请核对代理规则。"
              : `检测到 ${result.resolvers.length} 个 DNS 解析出口。`
        setDns({ state: possibleLeak ? "warning" : "success", result, message })
        return result
      } catch (error) {
        setDns({ state: "error", message: getErrorMessage(error, "DNS 检测失败") })
        return null
      } finally {
        dnsTask.current = null
      }
    })()

    dnsTask.current = task
    return task
  }

  function runWebRtc() {
    if (webRtcTask.current) return webRtcTask.current

    const task = (async () => {
      setWebRtc({ state: "running", message: "正在通过多个 STUN 节点检查 UDP 出口" })
      const baseline = [publicIp.result?.ip, ...splitResults.filter(hasExactSplitIp).map((result) => result.ip)].filter(
        (address): address is string => Boolean(address),
      )
      try {
        const result = await runAbortable((signal) => checkWebRtcLeak(baseline, signal))
        setWebRtc({ state: result.state, result, message: result.message })
        return result
      } catch (error) {
        setWebRtc({ state: "error", message: getErrorMessage(error, "WebRTC 检测失败") })
        return null
      } finally {
        webRtcTask.current = null
      }
    })()

    webRtcTask.current = task
    return task
  }

  const completedSplitResults = splitResults.filter((result) => result.state === "success" || result.state === "error")
  const successfulSplitResults = splitResults.filter((result) => result.state === "success")
  const exactSplitResults = splitResults.filter(hasExactSplitIp)
  const splitExits = [
    ...exactSplitResults
      .reduce((exits, result) => {
        const existing = exits.get(result.ip)
        if (!existing || (!existing.countryCode && result.countryCode)) {
          exits.set(result.ip, { ip: result.ip, countryCode: result.countryCode })
        }
        return exits
      }, new Map<string, { ip: string; countryCode?: string }>())
      .values(),
  ]
  const uniqueSplitIps = splitExits.map((exit) => exit.ip)
  const splitState: DiagnosticState = splitRunning
    ? "running"
    : splitResults.length === 0
      ? "idle"
      : successfulSplitResults.length === 0
        ? "error"
        : uniqueSplitIps.length > 1
          ? "warning"
          : "success"
  const splitMessage =
    splitState === "idle"
      ? `核心检测 ${coreTargets.length} 个站点，完整检测 ${allTargets.length} 个站点`
      : splitState === "running"
        ? `已完成 ${completedSplitResults.length}/${splitResults.length}`
        : splitState === "error"
          ? "未能取得网站出口数据"
          : `检测到 ${uniqueSplitIps.length} 个出口 IP`
  const completedConnectivityResults = connectivityResults.filter((result) => result.state === "success" || result.state === "error")
  const reachableConnectivityResults = connectivityResults.filter((result) => result.state === "success")
  const completedAiResults = aiResults.filter((result) => result.state === "success" || result.state === "error")
  const aiComplete = aiResults.length === aiTargets.length && completedAiResults.length === aiTargets.length
  const aiState: DiagnosticState = aiRunning
    ? "running"
    : aiResults.length === 0
      ? "idle"
      : completedAiResults.length < aiTargets.length
        ? "warning"
        : completedAiResults.some((result) => result.state === "success")
          ? "success"
          : "error"
  const connectivityState: DiagnosticState = connectivityRunning
    ? "running"
    : completedConnectivityResults.length === 0
      ? "idle"
      : reachableConnectivityResults.length === 0
        ? "error"
        : completedConnectivityResults.some((result) => result.state === "error")
          ? "warning"
          : "success"
  const connectivityMessage = connectivityRunning
    ? `已完成 ${completedConnectivityResults.length}/${CONNECTIVITY_TARGETS.length}`
    : completedConnectivityResults.length === 0
      ? `3 个区域，${CONNECTIVITY_TARGETS.length} 个站点，${CONNECTIVITY_PROBE_ROUNDS} 轮中位数`
      : `已测试 ${completedConnectivityResults.length}/${CONNECTIVITY_TARGETS.length}，可达 ${reachableConnectivityResults.length}`
  const baselineAddresses = new Set(
    [publicIp.result?.ip, ...exactSplitResults.flatMap((result) => (result.ip ? [result.ip] : []))].filter((address): address is string =>
      Boolean(address),
    ),
  )

  function getCandidateLocation(candidate: WebRtcCandidate) {
    if (candidate.address.endsWith(".local")) return "mDNS 隐私地址"
    if (candidate.address === publicIp.result?.ip) return publicIp.result.location || "与网页出口一致"
    return exactSplitResults.find((result) => result.ip === candidate.address)?.location || (candidate.private ? "局域网" : "未查询")
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined
    if (event.key === "ArrowRight") nextIndex = (index + 1) % DIAGNOSTIC_TABS.length
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + DIAGNOSTIC_TABS.length) % DIAGNOSTIC_TABS.length
    if (event.key === "Home") nextIndex = 0
    if (event.key === "End") nextIndex = DIAGNOSTIC_TABS.length - 1
    if (nextIndex === undefined) return

    event.preventDefault()
    const tab = DIAGNOSTIC_TABS[nextIndex]
    setActiveTab(tab.id)
    document.getElementById(`diagnostic-tab-${tab.id}`)?.focus()
  }

  return (
    <main className="network-diagnostics">
      <header className="network-diagnostics__intro" aria-labelledby="network-diagnostics-title">
        <Link to="/" className="network-diagnostics__back">
          <i className="ri-arrow-left-line" aria-hidden="true" />
          返回节点状态
        </Link>
        <div className="network-diagnostics__heading">
          <span className="network-diagnostics__mark" aria-hidden="true">
            <i className="ri-route-line" />
          </span>
          <div>
            <h1 id="network-diagnostics-title">网络与 IP 分流检测</h1>
            <p>分别检查网页出口、网站分流、网络连通性、DNS 解析与 WebRTC UDP 路径。</p>
          </div>
          <IpMaskToggle checked={maskIp} onCheckedChange={setMaskIp} />
        </div>
        <aside className="network-diagnostics__privacy">
          <i className="ri-shield-check-line" aria-hidden="true" />
          <p>测试仅在需要时发起，结果只保存在当前浏览器内存。IP 查询是进入页面后唯一自动执行的外部请求，并缓存 5 分钟。</p>
        </aside>
      </header>

      <DiagnosticSection
        id="public-ip-title"
        title="我的 IP"
        description="查询当前网页连接使用的 IPv4 地址和归属地。"
        status={
          <StatusLabel state={publicIp.state}>{publicIp.state === "running" ? "正在查询" : publicIp.message || "进入页面后自动查询一次"}</StatusLabel>
        }
        actions={
          <ActionButton onClick={() => void runPublicIp()} disabled={publicIp.state === "running"} primary>
            {publicIp.result ? "重新查询" : "查询 IP"}
          </ActionButton>
        }
      >
        {publicIp.result ? (
          <div className="network-diagnostics__ip-result">
            <div>
              <span>IPv4</span>
              <code>{maskIp ? maskAddress(publicIp.result.ip) : publicIp.result.ip}</code>
            </div>
            <dl>
              <div>
                <dt>归属地</dt>
                <dd>{publicIp.result.location || "未知"}</dd>
              </div>
            </dl>
          </div>
        ) : publicIp.state === "running" ? (
          <div className="network-diagnostics__ip-skeleton" aria-hidden="true">
            <span />
            <span />
          </div>
        ) : (
          <EmptyResult>暂未取得公网 IP，请检查网络后重新查询。</EmptyResult>
        )}
      </DiagnosticSection>

      <nav className="network-diagnostics__tabs" role="tablist" aria-label="诊断项目">
        {DIAGNOSTIC_TABS.map((tab, index) => (
          <button
            type="button"
            id={`diagnostic-tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`diagnostic-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            key={tab.id}
          >
            <i className={tab.icon} aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        id={`diagnostic-panel-${activeTab}`}
        className="network-diagnostics__tabpanel"
        role="tabpanel"
        aria-labelledby={`diagnostic-tab-${activeTab}`}
      >
        {activeTab === "split" ? (
          <DiagnosticSection
            id="split-test-title"
            title="网站分流测试"
            description="连接国内与国际网站的轻量探测端点，核对每个网站实际使用的出口 IP。"
            status={<StatusLabel state={splitState}>{splitMessage}</StatusLabel>}
            actions={
              <>
                <ActionButton onClick={() => void runSplit("core")} disabled={splitRunning} primary={splitMode === "core" && splitRunning}>
                  核心检测
                </ActionButton>
                <ActionButton onClick={() => void runSplit("full")} disabled={splitRunning} primary={splitMode === "full" && splitRunning}>
                  完整检测
                </ActionButton>
              </>
            }
          >
            {uniqueSplitIps.length > 0 ? (
              <div className="network-diagnostics__exit-summary">
                <span>分流出口 IP 汇总</span>
                <div>
                  {splitExits.map((exit) => (
                    <span className="network-diagnostics__exit" key={exit.ip}>
                      <CountryFlag countryCode={exit.countryCode} />
                      <code>{maskIp ? maskAddress(exit.ip) : exit.ip}</code>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {splitResults.length > 0 ? (
              <div className="network-diagnostics__table network-diagnostics__table--split" role="table" aria-label="网站分流检测结果">
                <div className="network-diagnostics__table-head" role="row">
                  <span role="columnheader">网站</span>
                  <span role="columnheader">类型</span>
                  <span role="columnheader">出口 IP</span>
                  <span role="columnheader">Geolocation</span>
                  <span role="columnheader">状态</span>
                </div>
                {splitResults.map((result) => (
                  <div className="network-diagnostics__table-row" role="row" key={result.id}>
                    <div className="network-diagnostics__site" role="cell">
                      <SiteLogo
                        label={result.label}
                        logoUrl={result.logoUrl}
                        fallbackUrl={getOriginFavicon(result.url)}
                        ready={result.state === "success"}
                      />
                      <strong>{result.label}</strong>
                    </div>
                    <span role="cell" data-label="类型">
                      {result.category}
                    </span>
                    <div className="network-diagnostics__address" role="cell" data-label="出口 IP">
                      <span>
                        {result.ip ? <CountryFlag countryCode={result.countryCode} /> : null}
                        <code>{formatSplitAddress(result, maskIp)}</code>
                      </span>
                    </div>
                    <span role="cell" data-label="Geolocation">
                      {formatGeolocation(result.location, result.countryCode) || "-"}
                    </span>
                    <span role="cell" data-label="状态">
                      <SplitResultStatus result={result} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <SplitTableSkeleton targets={splitMode === "full" ? allTargets : coreTargets} />
            )}
          </DiagnosticSection>
        ) : activeTab === "connectivity" ? (
          <DiagnosticSection
            id="connectivity-test-title"
            title="网络连通性测试"
            description="从当前浏览器直接测试日本、美国和全球常用站点的实时连通性与延迟。"
            status={<StatusLabel state={connectivityState}>{connectivityMessage}</StatusLabel>}
            actions={
              <ActionButton onClick={() => void runConnectivity()} disabled={connectivityRunning} primary>
                {completedConnectivityResults.length > 0 ? "重新测试" : "开始测试"}
              </ActionButton>
            }
          >
            <div className="network-diagnostics__connectivity-legend" aria-label="延迟分级">
              <span>
                <i className="network-diagnostics__connectivity-sample network-diagnostics__connectivity-sample--fast" aria-hidden="true" />
                优于 100 ms
              </span>
              <span>
                <i className="network-diagnostics__connectivity-sample network-diagnostics__connectivity-sample--normal" aria-hidden="true" />
                100-399 ms
              </span>
              <span>
                <i className="network-diagnostics__connectivity-sample network-diagnostics__connectivity-sample--slow" aria-hidden="true" />
                400 ms 以上
              </span>
              <span>
                <i className="network-diagnostics__connectivity-sample network-diagnostics__connectivity-sample--timeout" aria-hidden="true" />
                超时
              </span>
            </div>
            <div className="network-diagnostics__connectivity-regions">
              {CONNECTIVITY_REGIONS.map((region) => (
                <ConnectivityRegionPanel
                  region={region}
                  results={connectivityResults.filter((result) => result.region === region.id)}
                  disabled={connectivityRunning}
                  onRetest={(regionId) => void runConnectivity(regionId)}
                  key={region.id}
                />
              ))}
            </div>
          </DiagnosticSection>
        ) : activeTab === "ai" ? (
          <DiagnosticSection
            id="ai-test-title"
            title="Claude 与 ChatGPT 检测"
            description="检查 AI 出口的信任评分、网络属性、安全风险、服务可用性与本地环境。"
            status={
              <StatusLabel state={aiState}>
                {aiRunning
                  ? `已完成 ${aiResults.filter((result) => result.state !== "running").length}/${aiTargets.length}`
                  : aiResults.length > 0
                    ? aiComplete
                      ? "检测完成"
                      : `已缓存 ${completedAiResults.length}/${aiTargets.length}`
                    : "按需检测，不自动发起请求"}
              </StatusLabel>
            }
            actions={
              <ActionButton onClick={() => void runAi(aiComplete)} disabled={aiRunning || aiTargets.length === 0} primary>
                {aiComplete ? "重新检测" : "开始检测"}
              </ActionButton>
            }
          >
            <div className="network-diagnostics__ai-service-tabs" role="tablist" aria-label="AI 服务">
              {(Object.values(AI_SERVICE_PROFILES) as Array<(typeof AI_SERVICE_PROFILES)[AiServiceId]>).map((profile) => (
                <button
                  type="button"
                  role="tab"
                  id={`ai-service-tab-${profile.id}`}
                  aria-controls={`ai-service-panel-${profile.id}`}
                  aria-selected={aiService === profile.id}
                  onClick={() => setAiService(profile.id)}
                  key={profile.id}
                >
                  <i className={profile.icon} aria-hidden="true" />
                  {profile.label}
                </button>
              ))}
            </div>
            {aiResults.length > 0 && aiDevice ? (
              <div id={`ai-service-panel-${aiService}`} role="tabpanel" aria-labelledby={`ai-service-tab-${aiService}`}>
                <AiDiagnosticsPanel
                  profile={AI_SERVICE_PROFILES[aiService]}
                  results={aiResults}
                  risk={aiRisks[aiService]}
                  riskState={aiRiskStates[aiService] || "idle"}
                  dns={dns}
                  webRtc={webRtc}
                  device={aiDevice}
                  maskIp={maskIp}
                  onRunDns={() => void runDns(5)}
                  onRunWebRtc={() => void runWebRtc()}
                />
              </div>
            ) : (
              <AiDetectionSkeleton />
            )}
          </DiagnosticSection>
        ) : (
          <section className="network-diagnostics__card" aria-label="DNS 与 WebRTC 泄露检测">
            <DiagnosticSubsection
              id="dns-leak-title"
              title="DNS 泄露测试"
              description="通过随机 EDNS 域名识别当前网络实际使用的 DNS 解析器。"
              status={<StatusLabel state={dns.state}>{dns.message || "快速测试 5 次，深度测试 8 次"}</StatusLabel>}
              actions={
                <>
                  <ActionButton onClick={() => void runDns(5)} disabled={dns.state === "running"} primary>
                    快速测试
                  </ActionButton>
                  <ActionButton onClick={() => void runDns(8)} disabled={dns.state === "running"}>
                    深度测试
                  </ActionButton>
                </>
              }
            >
              {dns.result?.resolvers.length ? (
                <div className="network-diagnostics__table network-diagnostics__table--dns" role="table" aria-label="DNS 泄露检测结果">
                  <div className="network-diagnostics__table-head" role="row">
                    <span role="columnheader">序号</span>
                    <span role="columnheader">DNS 解析器 IP</span>
                    <span role="columnheader">归属地</span>
                    <span role="columnheader">服务商</span>
                    <span role="columnheader">状态</span>
                  </div>
                  {dns.result.resolvers.map((resolver, index) => {
                    const possibleLeak = isPossibleDnsLeak(publicIp.result?.location, resolver.location)
                    return (
                      <div className="network-diagnostics__table-row" role="row" key={resolver.ip}>
                        <span role="cell">{index + 1}</span>
                        <code role="cell" data-label="解析器 IP">
                          {maskIp ? maskAddress(resolver.ip) : resolver.ip}
                        </code>
                        <span role="cell" data-label="归属地">
                          {resolver.location || "未知"}
                        </span>
                        <span role="cell" data-label="服务商">
                          {resolver.provider || "未知"}
                        </span>
                        <span role="cell" data-label="状态">
                          <StatusLabel state={possibleLeak ? "warning" : "success"}>{possibleLeak ? "需核对" : "正常"}</StatusLabel>
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : dns.result ? (
                <EmptyResult>未检测到 DNS 解析器。可能启用了加密 DNS，或当前网络阻止了探测。</EmptyResult>
              ) : (
                <EmptyResult>点击快速测试或深度测试后显示解析器 IP、归属地、服务商和状态。</EmptyResult>
              )}
            </DiagnosticSubsection>

            <DiagnosticSubsection
              id="webrtc-leak-title"
              title="WebRTC 泄露测试"
              description="通过 Google 与 Cloudflare 的多个 STUN 节点检查 UDP、IPv4 和 IPv6 出口。"
              status={<StatusLabel state={webRtc.state}>{webRtc.message || "检测不会请求摄像头或麦克风权限"}</StatusLabel>}
              actions={
                <ActionButton onClick={() => void runWebRtc()} disabled={webRtc.state === "running"} primary>
                  {webRtc.result ? "重新检测" : "开始检测"}
                </ActionButton>
              }
            >
              {webRtc.result?.candidates.length ? (
                <div className="network-diagnostics__table network-diagnostics__table--webrtc" role="table" aria-label="WebRTC 泄露检测结果">
                  <div className="network-diagnostics__table-head" role="row">
                    <span role="columnheader">序号</span>
                    <span role="columnheader">IP 地址</span>
                    <span role="columnheader">类型</span>
                    <span role="columnheader">归属地</span>
                    <span role="columnheader">状态</span>
                  </div>
                  {webRtc.result.candidates.map((candidate, index) => (
                    <div className="network-diagnostics__table-row" role="row" key={`${candidate.address}-${candidate.protocol}-${candidate.type}`}>
                      <span role="cell">{index + 1}</span>
                      <code role="cell" data-label="IP 地址">
                        {maskIp ? maskAddress(candidate.address) : candidate.address}
                      </code>
                      <span role="cell" data-label="类型">
                        {WEBRTC_TYPE_LABELS[candidate.type || ""] || candidate.type || "未知"}
                        {candidate.protocol ? ` / ${candidate.protocol.toUpperCase()}` : ""}
                      </span>
                      <span role="cell" data-label="归属地">
                        {getCandidateLocation(candidate)}
                      </span>
                      <span role="cell" data-label="状态">
                        <WebRtcStatus candidate={candidate} baseline={baselineAddresses} />
                      </span>
                    </div>
                  ))}
                </div>
              ) : webRtc.result ? (
                <EmptyResult>未发现可显示的 WebRTC 候选地址。</EmptyResult>
              ) : (
                <EmptyResult>点击开始检测后显示 WebRTC 地址、候选类型、归属信息和泄露状态。</EmptyResult>
              )}
            </DiagnosticSubsection>
          </section>
        )}
      </div>
    </main>
  )
}
