import ServerFlag from "@/components/ServerFlag"
import type { AiDeviceInfo } from "@/lib/ai-diagnostics"
import { maskIpAddress, type AiRiskResult, type AiServiceId, type DiagnosticState, type DnsLeakResult, type SplitResult, type WebRtcResult } from "@/lib/network-diagnostics"

type ServiceProfile = { id: AiServiceId; label: string; icon: string; targetIds: string[]; primaryTargetId: string }

const COUNTRY_LANGUAGES: Record<string, string[]> = {
  AU: ["en"], CA: ["en", "fr"], CN: ["zh"], DE: ["de"], FR: ["fr"], GB: ["en"], HK: ["zh", "en"],
  JP: ["ja"], KR: ["ko"], SG: ["en", "zh", "ms", "ta"], TW: ["zh"], US: ["en"],
}

function ValueTag({ state, children }: { state: "safe" | "warning" | "danger" | "neutral"; children: React.ReactNode }) {
  return <span className={`network-diagnostics__ai-tag network-diagnostics__ai-tag--${state}`}>{children}</span>
}

function MetricRow({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`network-diagnostics__ai-metric ${className}`}>
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  )
}

function PanelCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <article className={`network-diagnostics__ai-panel-card ${className}`}>
      <h3>{title}</h3>
      {children}
    </article>
  )
}

function getScoreLabel(score?: number) {
  if (score === undefined) return { text: "暂无评分", state: "neutral" as const }
  if (score >= 90) return { text: "极度纯净", state: "safe" as const }
  if (score >= 75) return { text: "较可信", state: "safe" as const }
  if (score >= 50) return { text: "需要留意", state: "warning" as const }
  return { text: "较高风险", state: "danger" as const }
}

function SecurityValue({ value, safeText = "未检测到", dangerText = "已检测到" }: { value?: boolean; safeText?: string; dangerText?: string }) {
  if (value === undefined) return <ValueTag state="neutral">未检测</ValueTag>
  return <ValueTag state={value ? "danger" : "safe"}>{value ? dangerText : safeText}</ValueTag>
}

function getAvailabilityState(result?: SplitResult) {
  if (!result || result.state === "idle") return <ValueTag state="neutral">未检测</ValueTag>
  if (result.state === "running") return <ValueTag state="neutral">检测中</ValueTag>
  if (result.state === "error") return <ValueTag state="danger">不可用</ValueTag>
  if ((result.duration || 0) >= 800) return <ValueTag state="warning">较慢</ValueTag>
  return <ValueTag state="safe">正常</ValueTag>
}

function getServiceStatus(results: SplitResult[], targetCount: number) {
  if (results.length === 0 || results.some((result) => result.state === "idle")) return { text: "尚未检测", state: "neutral" as const }
  if (results.some((result) => result.state === "running")) return { text: "检测中", state: "neutral" as const }
  const complete = results.length === targetCount && results.every((result) => result.state === "success")
  return { text: complete ? "全部服务正常" : "部分服务不可用", state: complete ? "safe" as const : "warning" as const }
}

function getConnectionType(risk?: AiRiskResult) {
  if (risk?.residential) return "住宅网络"
  if (risk?.datacenter) return "机房网络"

  const value = risk?.connectionType || risk?.companyType
  if (!value) return "-"
  if (/residential|home|broadband/i.test(value)) return "住宅网络"
  if (/hosting|datacenter|data center/i.test(value)) return "机房网络"
  if (/business|corporate/i.test(value)) return "企业网络"
  if (/mobile|cellular/i.test(value)) return "移动网络"
  return value
}

function getLeakStatus(check: { state: DiagnosticState; result?: unknown }) {
  if (check.state === "running") return { text: "正在检测", state: "neutral" as const }
  if (check.state === "error") return { text: "检测失败", state: "warning" as const }
  if (check.state === "warning") return { text: "需要核对", state: "warning" as const }
  if (check.state === "success") return { text: "未发现异常", state: "safe" as const }
  return { text: "尚未检测", state: "neutral" as const }
}

function formatBoolean(value: boolean) {
  return value ? "是" : "否"
}

export interface AiDiagnosticsPanelProps {
  profile: ServiceProfile
  results: SplitResult[]
  risk?: AiRiskResult
  riskState: DiagnosticState
  dns: { state: DiagnosticState; result?: DnsLeakResult; message?: string }
  webRtc: { state: DiagnosticState; result?: WebRtcResult; message?: string }
  device?: AiDeviceInfo
  maskIp: boolean
  onRunDns: () => void
  onRunWebRtc: () => void
}

export default function AiDiagnosticsPanel({ profile, results, risk, riskState, dns, webRtc, device, maskIp, onRunDns, onRunWebRtc }: AiDiagnosticsPanelProps) {
  const serviceResults = profile.targetIds.map((id) => results.find((result) => result.id === id)).filter((result): result is SplitResult => Boolean(result))
  const primary = serviceResults.find((result) => result.id === profile.primaryTargetId) || serviceResults[0]
  const score = getScoreLabel(risk?.trustScore)
  const countryCode = risk?.countryCode || primary?.countryCode
  const country = risk?.country || primary?.country || "-"
  const city = risk?.city || primary?.city || "-"
  const support = primary?.state === "success" ? true : undefined
  const connectionType = getConnectionType(risk)
  const localLanguages = COUNTRY_LANGUAGES[countryCode || ""]
  const languageMatch = localLanguages && device ? localLanguages.includes(device.primaryLanguage) : undefined
  const dnsAddresses = dns.result?.resolvers.map((resolver) => resolver.ip) || []
  const rtcAddresses = webRtc.result?.publicAddresses || []
  const dnsStatus = getLeakStatus(dns)
  const webRtcStatus = getLeakStatus(webRtc)
  const exitTimezone = risk?.timezone || primary?.timezone
  const serviceStatus = getServiceStatus(serviceResults, profile.targetIds.length)

  return (
    <div className="network-diagnostics__ai-dashboard">
      <PanelCard title={`${profile.label} AI 信任评分`} className="network-diagnostics__ai-score-card">
        <div className="network-diagnostics__ai-score">
          <div>
            <strong>{risk?.trustScore ?? "--"}</strong>
            <ValueTag state={score.state}>{score.text}</ValueTag>
          </div>
          <span>{riskState === "running" ? "正在查询出口风险" : riskState === "error" ? "风险查询失败，可重新检测" : risk ? "该评分来自出口 IP 风险信号" : "完成检测后显示评分"}</span>
          <div className="network-diagnostics__ai-gauge" aria-label={risk?.trustScore === undefined ? "暂无信任评分" : `信任评分 ${risk.trustScore}`}>
            {risk?.trustScore === undefined ? null : <span style={{ left: `${risk.trustScore}%` }} />}
          </div>
          <div className="network-diagnostics__ai-gauge-labels"><span>0 高危</span><span>25</span><span>50</span><span>75</span><span>100 可信</span></div>
        </div>
        <MetricRow label={`${profile.label} 支持地区`}>
          {support === undefined ? <ValueTag state="neutral">未检测</ValueTag> : <ValueTag state={support ? "safe" : "danger"}>{support ? "正常" : "不支持"}</ValueTag>}
        </MetricRow>
      </PanelCard>

      <PanelCard title={`${profile.label} AI 出口 IP 属性`}>
        <MetricRow label="出口 IP">{primary?.ip ? (maskIp ? maskIpAddress(primary.ip) : primary.ip) : "-"}</MetricRow>
        <MetricRow label="地区"><span className="network-diagnostics__ai-inline">{countryCode ? <ServerFlag country_code={countryCode} className="network-diagnostics__country-flag" /> : null}{country}</span></MetricRow>
        <MetricRow label="城市">{city}</MetricRow>
        <MetricRow label="IP 属性"><ValueTag state={risk?.datacenter || risk?.vpn || risk?.proxy ? "warning" : risk?.residential ? "safe" : "neutral"}>{connectionType}</ValueTag></MetricRow>
        <MetricRow label="ASN">{risk?.asn || primary?.asn || "-"}</MetricRow>
        <MetricRow label="运营商">{risk?.isp || primary?.isp || "-"}</MetricRow>
      </PanelCard>

      <PanelCard title={`${profile.label} AI 出口 IP 安全检测`}>
        <MetricRow label="VPN"><SecurityValue value={risk?.vpn} /></MetricRow>
        <MetricRow label="代理 (Proxy)"><SecurityValue value={risk?.proxy} /></MetricRow>
        <MetricRow label="Tor"><SecurityValue value={risk?.tor} /></MetricRow>
        <MetricRow label="机器人 (Crawler)"><SecurityValue value={risk?.crawler} safeText="否" dangerText="是" /></MetricRow>
        <MetricRow label="滥用记录"><SecurityValue value={risk?.abuser} safeText="无记录" dangerText="有记录" /></MetricRow>
      </PanelCard>

      <PanelCard title={`${profile.label} 可用性检测`}>
        {profile.targetIds.map((id) => {
          const result = results.find((item) => item.id === id)
          return <MetricRow label={result?.label || id} key={id}><span className="network-diagnostics__ai-inline">{getAvailabilityState(result)}{result?.duration !== undefined ? `${result.duration} ms` : ""}</span></MetricRow>
        })}
        <MetricRow label={`${profile.label} 服务状态`}>
          <ValueTag state={serviceStatus.state}>{serviceStatus.text}</ValueTag>
        </MetricRow>
      </PanelCard>

      <PanelCard title="DNS 泄露检测">
        <button type="button" className="network-diagnostics__button network-diagnostics__ai-card-action" onClick={onRunDns} disabled={dns.state === "running"}>查询 DNS 安全</button>
        <MetricRow label="状态"><ValueTag state={dnsStatus.state}>{dnsStatus.text}</ValueTag></MetricRow>
        <MetricRow label="DNS 出口 IP">{dnsAddresses.length ? dnsAddresses.map((address) => maskIp ? maskIpAddress(address) : address).join(", ") : "-"}</MetricRow>
      </PanelCard>

      <PanelCard title="WebRTC UDP 泄露检测">
        <button type="button" className="network-diagnostics__button network-diagnostics__ai-card-action" onClick={onRunWebRtc} disabled={webRtc.state === "running"}>深度查询</button>
        <MetricRow label="状态"><ValueTag state={webRtcStatus.state}>{webRtcStatus.text}</ValueTag></MetricRow>
        <MetricRow label="UDP 出口 IP">{rtcAddresses.length ? rtcAddresses.map((address) => maskIp ? maskIpAddress(address) : address).join(", ") : "-"}</MetricRow>
      </PanelCard>

      <PanelCard title={`${profile.label} AI 出口 IP 用户设备信息`} className="network-diagnostics__ai-device-card">
        <MetricRow label="时区">{device ? <span className="network-diagnostics__ai-device-value"><ValueTag state={exitTimezone && exitTimezone !== device.timezone ? "warning" : "safe"}>{exitTimezone && exitTimezone !== device.timezone ? "时区不一致" : "时区正常"}</ValueTag>本地：{device.timezone} ({device.utcOffset}){exitTimezone ? ` / 出口：${exitTimezone}` : ""}</span> : "-"}</MetricRow>
        <MetricRow label="语言">{device ? <span className="network-diagnostics__ai-device-value">{languageMatch === undefined ? null : <ValueTag state={languageMatch ? "safe" : "warning"}>{languageMatch ? "语言匹配" : "语言不一致"}</ValueTag>}{device.languages}</span> : "-"}</MetricRow>
        <MetricRow label="操作系统 / 浏览器">{device ? `${device.platform} / ${device.browser}` : "-"}</MetricRow>
        <MetricRow label="触屏">{device ? formatBoolean(device.touch) : "-"}</MetricRow>
        <MetricRow label="网络类型">{device?.network || "-"}</MetricRow>
        <MetricRow label="Do Not Track">{device?.doNotTrack || "-"}</MetricRow>
        <MetricRow label="Cookie">{device ? <ValueTag state={device.cookies ? "safe" : "warning"}>{device.cookies ? "已启用" : "已禁用"}</ValueTag> : "-"}</MetricRow>
        <MetricRow label="WebGL 渲染器" className="network-diagnostics__ai-metric--long">{device?.webglRenderer || "-"}</MetricRow>
        <MetricRow label="Canvas 指纹">{device?.canvasFingerprint || "-"}</MetricRow>
        <MetricRow label="WebGL 指纹">{device?.webglFingerprint || "-"}</MetricRow>
      </PanelCard>
    </div>
  )
}
