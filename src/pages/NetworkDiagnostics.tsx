import ServerFlag from "@/components/ServerFlag"
import {
  type DiagnosticState,
  type DnsLeakResult,
  type PublicIpResult,
  type SplitMode,
  type SplitResult,
  type WebRtcCandidate,
  type WebRtcResult,
  checkDnsLeak,
  checkPublicIp,
  checkSplitTargets,
  checkWebRtcLeak,
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
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

function DiagnosticSection({
  id,
  title,
  description,
  status,
  actions,
  children,
  footer,
}: {
  id: string
  title: string
  description: string
  status: React.ReactNode
  actions: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <section className="network-diagnostics__card" aria-labelledby={id}>
      <header className="network-diagnostics__section-header">
        <div className="network-diagnostics__section-copy">
          <h2 id={id}>{title}</h2>
          <p>{description}</p>
          {status}
        </div>
        <div className="network-diagnostics__section-actions">{actions}</div>
      </header>
      {children}
      {footer ? <footer className="network-diagnostics__section-footer">{footer}</footer> : null}
    </section>
  )
}

function EmptyResult({ children }: { children: React.ReactNode }) {
  return <div className="network-diagnostics__empty">{children}</div>
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

function WebRtcStatus({ candidate, baseline }: { candidate: WebRtcCandidate; baseline: Set<string> }) {
  if (candidate.address.endsWith(".local")) return <StatusLabel state="success">地址已保护</StatusLabel>
  if (candidate.private) return <StatusLabel state="warning">可能泄露</StatusLabel>
  if (baseline.size > 0 && !baseline.has(candidate.address)) return <StatusLabel state="warning">出口不同</StatusLabel>
  return <StatusLabel state="success">正常</StatusLabel>
}

export default function NetworkDiagnostics() {
  const allTargets = useMemo(() => getSplitTargets("full"), [])
  const coreTargets = useMemo(() => getSplitTargets("core"), [])
  const dnsEndpoint = useMemo(getDnsEndpoint, [])
  const cachedPublicIp = useMemo(getCachedPublicIp, [])
  const cachedSplitResults = useMemo(getCachedSplitResults, [])
  const controllers = useRef(new Set<AbortController>())
  const publicIpTask = useRef<Promise<PublicIpResult | null> | null>(null)
  const splitTask = useRef<Promise<SplitResult[]> | null>(null)
  const dnsTask = useRef<Promise<DnsLeakResult | null> | null>(null)
  const webRtcTask = useRef<Promise<WebRtcResult | null> | null>(null)
  const [publicIp, setPublicIp] = useState<CheckState<PublicIpResult>>(
    cachedPublicIp ? { state: "success", result: cachedPublicIp, message: "已读取本次会话缓存" } : { state: "idle" },
  )
  const [maskIp, setMaskIp] = useState(false)
  const [splitMode, setSplitMode] = useState<SplitMode>(cachedSplitResults.length > coreTargets.length ? "full" : "core")
  const [splitResults, setSplitResults] = useState<SplitResult[]>(cachedSplitResults)
  const [splitRunning, setSplitRunning] = useState(false)
  const [dns, setDns] = useState<CheckState<DnsLeakResult>>({ state: "idle" })
  const [webRtc, setWebRtc] = useState<CheckState<WebRtcResult>>({ state: "idle" })

  useEffect(() => {
    if (!cachedPublicIp) void runPublicIp(false)
    return () => {
      controllers.current.forEach((controller) => controller.abort())
      controllers.current.clear()
    }
  }, [cachedPublicIp])

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
      const baseline = [
        publicIp.result?.ip,
        ...splitResults.flatMap((result) => (result.state === "success" && result.ip ? [result.ip] : [])),
      ].filter((address): address is string => Boolean(address))
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
  const splitExits = [
    ...successfulSplitResults
      .reduce((exits, result) => {
        if (!result.ip) return exits
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
  const baselineAddresses = new Set(
    [publicIp.result?.ip, ...successfulSplitResults.flatMap((result) => (result.ip ? [result.ip] : []))].filter((address): address is string =>
      Boolean(address),
    ),
  )

  function getCandidateLocation(candidate: WebRtcCandidate) {
    if (candidate.address.endsWith(".local")) return "mDNS 隐私地址"
    if (candidate.address === publicIp.result?.ip) return publicIp.result.location || "与网页出口一致"
    return successfulSplitResults.find((result) => result.ip === candidate.address)?.location || (candidate.private ? "局域网" : "未查询")
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
            <p>分别检查网页出口、网站分流、DNS 解析与 WebRTC UDP 路径。</p>
          </div>
        </div>
      </header>

      <DiagnosticSection
        id="public-ip-title"
        title="我的 IP"
        description="查询当前网页连接使用的 IPv4 地址和归属地。"
        status={
          <StatusLabel state={publicIp.state}>{publicIp.state === "running" ? "正在查询" : publicIp.message || "进入页面后自动查询一次"}</StatusLabel>
        }
        actions={
          <>
            {publicIp.result ? (
              <ActionButton onClick={() => setMaskIp((current) => !current)}>
                <i className={maskIp ? "ri-eye-line" : "ri-eye-off-line"} aria-hidden="true" />
                {maskIp ? "显示 IP" : "隐藏 IP"}
              </ActionButton>
            ) : null}
            <ActionButton onClick={() => void runPublicIp()} disabled={publicIp.state === "running"} primary>
              {publicIp.result ? "重新查询" : "查询 IP"}
            </ActionButton>
          </>
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
        footer={
          <p>
            完整检测包含参考站的 {allTargets.length} 个站点，仅在点击后发起请求。站点图标通过 DuckDuckGo 按需加载；仅对未返回国家代码的出口使用
            ipwho.is 补充查询，相同 IP 缓存 24 小时。
          </p>
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
              <span role="columnheader">地区</span>
              <span role="columnheader">状态</span>
            </div>
            {splitResults.map((result) => (
              <div className="network-diagnostics__table-row" role="row" key={result.id}>
                <div className="network-diagnostics__site" role="cell">
                  <SiteLogo
                    label={result.label}
                    logoUrl={result.logoUrl}
                    fallbackUrl={getOriginFavicon(result.url)}
                    ready={result.state !== "running"}
                  />
                  <strong>{result.label}</strong>
                </div>
                <span role="cell" data-label="类型">
                  {result.category}
                </span>
                <div className="network-diagnostics__address" role="cell" data-label="出口 IP">
                  <span>
                    {result.ip ? <CountryFlag countryCode={result.countryCode} /> : null}
                    <code>{result.ip ? (maskIp ? maskAddress(result.ip) : result.ip) : result.state === "running" ? "检测中" : "-"}</code>
                  </span>
                </div>
                <span role="cell" data-label="地区">
                  {result.location || "-"}
                </span>
                <span role="cell" data-label="状态">
                  {result.state === "running" ? (
                    <StatusLabel state="running">连接中</StatusLabel>
                  ) : result.state === "success" ? (
                    <StatusLabel state="success">{result.duration} ms</StatusLabel>
                  ) : (
                    <StatusLabel state="error">{result.message || "失败"}</StatusLabel>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyResult>选择核心检测或完整检测后显示网站、出口 IP、地区和连接状态。</EmptyResult>
        )}
      </DiagnosticSection>

      <DiagnosticSection
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
        footer={
          <p>
            {dnsEndpoint
              ? "当前使用站点配置的同源 DNS 检测服务。"
              : "当前使用 ip-api.com EDNS 公共检测服务，仅限非商业使用。该服务会看到本次测试的 DNS 查询和网页出口 IP。"}
          </p>
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
      </DiagnosticSection>

      <DiagnosticSection
        id="webrtc-leak-title"
        title="WebRTC 泄露测试"
        description="通过 Google 与 Cloudflare 的多个 STUN 节点检查 UDP、IPv4 和 IPv6 出口。"
        status={<StatusLabel state={webRtc.state}>{webRtc.message || "检测不会请求摄像头或麦克风权限"}</StatusLabel>}
        actions={
          <ActionButton onClick={() => void runWebRtc()} disabled={webRtc.state === "running"} primary>
            {webRtc.result ? "重新检测" : "开始检测"}
          </ActionButton>
        }
        footer={<p>公网 UDP 地址会与我的 IP 和网站分流结果对比。不同出口可能是预期分流，也可能表示 UDP 未被代理接管。</p>}
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
      </DiagnosticSection>

      <aside className="network-diagnostics__privacy">
        <i className="ri-shield-check-line" aria-hidden="true" />
        <p>测试仅在需要时发起，结果只保存在当前浏览器内存。IP 查询是进入页面后唯一自动执行的外部请求，并缓存 5 分钟。</p>
      </aside>
    </main>
  )
}
