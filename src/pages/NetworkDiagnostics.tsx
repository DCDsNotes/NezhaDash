import {
  type DiagnosticState,
  type DnsLeakResult,
  type SplitResult,
  type WebRtcResult,
  checkDnsLeak,
  checkSplitTargets,
  checkWebRtcLeak,
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
  error: "ri-error-warning-line",
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function StatusLabel({ state, children }: { state: DiagnosticState; children: React.ReactNode }) {
  return (
    <span className={`network-diagnostics__status network-diagnostics__status--${state}`}>
      <i className={STATUS_ICONS[state]} aria-hidden="true" />
      {children}
    </span>
  )
}

function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="network-diagnostics__button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function SectionHeader({
  title,
  description,
  status,
  action,
}: {
  title: string
  description: string
  status?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <header className="network-diagnostics__section-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="network-diagnostics__section-action">
        {status}
        {action}
      </div>
    </header>
  )
}

function LeakCheck({
  title,
  description,
  state,
  action,
  children,
}: {
  title: string
  description: string
  state: DiagnosticState
  action: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <article className="network-diagnostics__leak-check">
      <header className="network-diagnostics__leak-header">
        <div>
          <h3>{title}</h3>
          {state === "running" ? <StatusLabel state="running">检测中</StatusLabel> : null}
        </div>
        {action}
      </header>
      <p className="network-diagnostics__leak-description">{description}</p>
      <div className="network-diagnostics__leak-result">{children}</div>
    </article>
  )
}

export default function NetworkDiagnostics() {
  const targets = useMemo(getSplitTargets, [])
  const dnsEndpoint = useMemo(getDnsEndpoint, [])
  const controllers = useRef(new Set<AbortController>())
  const splitTask = useRef<Promise<SplitResult[]> | null>(null)
  const dnsTask = useRef<Promise<DnsLeakResult | null> | null>(null)
  const webRtcTask = useRef<Promise<WebRtcResult | null> | null>(null)
  const allTask = useRef<Promise<void> | null>(null)
  const [splitResults, setSplitResults] = useState<SplitResult[]>(targets.map((target) => ({ ...target, state: "idle" })))
  const [splitRunning, setSplitRunning] = useState(false)
  const [dns, setDns] = useState<CheckState<DnsLeakResult>>({ state: "idle" })
  const [webRtc, setWebRtc] = useState<CheckState<WebRtcResult>>({ state: "idle" })
  const [allRunning, setAllRunning] = useState(false)

  useEffect(
    () => () => {
      controllers.current.forEach((controller) => controller.abort())
      controllers.current.clear()
    },
    [],
  )

  async function runAbortable<T>(task: (signal: AbortSignal) => Promise<T>) {
    const controller = new AbortController()
    controllers.current.add(controller)
    try {
      return await task(controller.signal)
    } finally {
      controllers.current.delete(controller)
    }
  }

  function runSplit() {
    if (splitTask.current) return splitTask.current

    const task = (async () => {
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

  function runDns() {
    if (!dnsEndpoint) return null
    if (dnsTask.current) return dnsTask.current

    const task = (async () => {
      setDns({ state: "running" })

      try {
        const result = await runAbortable((signal) => checkDnsLeak(dnsEndpoint, signal))
        setDns({
          state: result.resolvers.length ? "success" : "warning",
          result,
          message: result.resolvers.length ? `检测到 ${result.resolvers.length} 个 DNS 解析出口。` : "暂未收到 DNS 解析结果，请稍后重试。",
        })
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

  function runWebRtc(results: SplitResult[] | Promise<SplitResult[]> = splitResults) {
    if (webRtcTask.current) return webRtcTask.current

    const task = (async () => {
      setWebRtc({ state: "running" })
      const baseline = Promise.resolve(results).then((items) => items.flatMap((item) => (item.state === "success" && item.ip ? [item.ip] : [])))

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

  function runAll() {
    if (allTask.current) return allTask.current

    const task = (async () => {
      setAllRunning(true)
      try {
        const splitPromise = runSplit()
        await Promise.all([splitPromise, runWebRtc(splitPromise), dnsEndpoint ? runDns() : Promise.resolve(null)])
      } finally {
        setAllRunning(false)
        allTask.current = null
      }
    })()

    allTask.current = task
    return task
  }

  const completedCount = splitResults.filter((result) => result.state === "success" || result.state === "error").length
  const successfulResults = splitResults.filter((result) => result.state === "success")
  const uniqueIps = [...new Set(successfulResults.flatMap((result) => (result.ip ? [result.ip] : [])))]
  const splitState: DiagnosticState = splitRunning
    ? "running"
    : completedCount === 0
      ? "idle"
      : successfulResults.length === 0
        ? "error"
        : uniqueIps.length > 1
          ? "warning"
          : "success"
  const splitMessage =
    splitState === "idle"
      ? "点击按钮后开始连接测试站点"
      : splitState === "running"
        ? "正在核对各站点出口"
        : splitState === "error"
          ? "未能取得出口数据"
          : uniqueIps.length > 1
            ? `发现 ${uniqueIps.length} 个出口，当前存在分流`
            : "测试站点使用同一出口"

  return (
    <div className="network-diagnostics">
      <section className="network-diagnostics__intro" aria-labelledby="network-diagnostics-title">
        <Link to="/" className="network-diagnostics__back">
          <i className="ri-arrow-left-line" aria-hidden="true" />
          返回节点状态
        </Link>
        <div className="network-diagnostics__intro-row">
          <div className="network-diagnostics__heading">
            <span className="network-diagnostics__mark" aria-hidden="true">
              <i className="ri-route-line" />
            </span>
            <div>
              <h1 id="network-diagnostics-title">网络与 IP 分流检测</h1>
              <p>核对不同站点的出口 IP，并检查 DNS 与 WebRTC 是否暴露了意外的网络路径。</p>
            </div>
          </div>
          <button
            type="button"
            className="network-diagnostics__button network-diagnostics__button--primary"
            onClick={runAll}
            disabled={allRunning || splitRunning || dns.state === "running" || webRtc.state === "running"}
          >
            <i className={allRunning ? "ri-loader-4-line" : "ri-pulse-line"} aria-hidden="true" />
            {allRunning ? "正在检测" : "开始全部检测"}
          </button>
        </div>
      </section>

      <section className="network-diagnostics__card">
        <SectionHeader
          title="IP 分流"
          description={`${targets.length} 个中国与国际测试站点，对比各连接实际使用的公网出口。`}
          status={<StatusLabel state={splitState}>{splitMessage}</StatusLabel>}
          action={
            <ActionButton onClick={runSplit} disabled={splitRunning || allRunning}>
              {completedCount > 0 ? "重新检测" : "检测分流"}
            </ActionButton>
          }
        />
        <div className="network-diagnostics__split-list" role="table" aria-label="IP 分流检测结果">
          <div className="network-diagnostics__split-head" role="row">
            <span role="columnheader">测试站点</span>
            <span role="columnheader">出口 IP</span>
            <span role="columnheader">地区</span>
            <span role="columnheader">状态</span>
          </div>
          {splitResults.map((result) => (
            <div className="network-diagnostics__split-row" role="row" key={result.id}>
              <div className="network-diagnostics__target" role="cell">
                <strong>{result.label}</strong>
                <span>{result.category}</span>
              </div>
              <code role="cell">{result.ip || (result.state === "running" ? "检测中" : "-")}</code>
              <span role="cell">{result.location || "-"}</span>
              <span role="cell">
                {result.state === "idle" ? (
                  <span className="network-diagnostics__muted">等待检测</span>
                ) : result.state === "running" ? (
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
        <p className="network-diagnostics__caption">地区代码由测试站点随连接信息返回，不额外调用 IP 地理位置服务。</p>
      </section>

      <section className="network-diagnostics__card">
        <SectionHeader title="泄露检测" description="对比 DNS 解析与 WebRTC UDP 路径，判断是否出现代理规则之外的网络出口。" />
        <div className="network-diagnostics__leak-grid">
          <LeakCheck
            title="DNS"
            description="需要本站权威 DNS 服务配合，浏览器无法直接读取系统使用的解析器。"
            state={dns.state}
            action={
              <ActionButton onClick={runDns} disabled={!dnsEndpoint || dns.state === "running" || allRunning}>
                {dns.result ? "重新检测" : "检测 DNS"}
              </ActionButton>
            }
          >
            {!dnsEndpoint ? (
              <div className="network-diagnostics__notice">
                <StatusLabel state="idle">尚未配置同源检测服务</StatusLabel>
                <p>默认不接入公共 DNS 泄露检测 API，避免把访问数据发送给第三方。</p>
                <details>
                  <summary>查看接入约定</summary>
                  <p>
                    在 <code>window.NetworkDiagnosticsConfig.dnsLeakEndpoint</code> 设置同源地址。服务端需支持 <code>start</code> 与{" "}
                    <code>result</code>
                    两个 JSON 操作。
                  </p>
                </details>
              </div>
            ) : dns.message ? (
              <div className="network-diagnostics__result-block" aria-live="polite">
                <StatusLabel state={dns.state}>{dns.message}</StatusLabel>
                {dns.result?.resolvers.length ? (
                  <ul className="network-diagnostics__result-list">
                    {dns.result.resolvers.map((resolver, index) => (
                      <li key={`${resolver.ip}-${index}`}>
                        <code>{resolver.ip}</code>
                        <span>{[resolver.provider, resolver.location].filter(Boolean).join(" · ") || "未知解析器"}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="network-diagnostics__empty">检测尚未开始，不会自动发送 DNS 探测请求。</div>
            )}
          </LeakCheck>

          <LeakCheck
            title="WebRTC"
            description="通过 STUN 获取 UDP 出口并与网页出口对比，无需摄像头或麦克风权限。"
            state={webRtc.state}
            action={
              <ActionButton onClick={() => void runWebRtc()} disabled={webRtc.state === "running" || allRunning}>
                {webRtc.result ? "重新检测" : "检测 WebRTC"}
              </ActionButton>
            }
          >
            {webRtc.message ? (
              <div className="network-diagnostics__result-block" aria-live="polite">
                <StatusLabel state={webRtc.state}>{webRtc.message}</StatusLabel>
                {webRtc.result?.candidates.length ? (
                  <ul className="network-diagnostics__result-list">
                    {webRtc.result.candidates.map((candidate) => (
                      <li key={`${candidate.address}-${candidate.protocol}-${candidate.type}`}>
                        <code>{candidate.address}</code>
                        <span>
                          {[candidate.protocol?.toUpperCase(), candidate.type, candidate.private ? "私有或受保护地址" : "公网地址"]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="network-diagnostics__empty">建议先运行 IP 分流，再检测 WebRTC，以便准确对比网页与 UDP 出口。</div>
            )}
          </LeakCheck>
        </div>
        <aside className="network-diagnostics__privacy">
          <i className="ri-check-line" aria-hidden="true" />
          <p>所有请求仅在点击检测后发起，结果只保留在当前页面内存中。默认不调用公共 IP 信息、地理位置或 DNS 查询 API。</p>
        </aside>
      </section>
    </div>
  )
}
