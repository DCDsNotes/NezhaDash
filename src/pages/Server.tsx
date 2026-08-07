import ServerFlag from "@/components/ServerFlag"
import { type ServerWorkspaceValue } from "@/hooks/use-server-workspace"
import { serverIdToServerKey } from "@/lib/server-key"
import { getServerCardViewModel, getServerHeaderStats, getServerStatus } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { type NezhaServer } from "@/types/nezha-api"
import { useMemo } from "react"
import { Link, useOutletContext } from "react-router-dom"

type ResourceSummary = {
  type: string
  label: string
  value: number
}

type BillingOverview = {
  tracked: number
  expiringSoon: number
  expired: number
  perpetual: number
  nearest: { name: string; days: number; endDate: string } | null
}

function getResourceSummaries(workspace: ServerWorkspaceValue): ResourceSummary[] {
  const onlineServers = workspace.filteredServers.filter((server) => getServerStatus(workspace.now, server) === "online")
  const resources = [
    { type: "cpu", label: "CPU" },
    { type: "mem", label: "内存" },
    { type: "disk", label: "磁盘" },
  ]

  return resources.map((resource) => {
    const values = onlineServers
      .map((server) => getServerCardViewModel(workspace.now, server).rings.find((ring) => ring.type === resource.type)?.used)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const average = values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0
    return { ...resource, value: Number(average.toFixed(1)) }
  })
}

function getBillingOverview(workspace: ServerWorkspaceValue): BillingOverview {
  const overview: BillingOverview = { tracked: 0, expiringSoon: 0, expired: 0, perpetual: 0, nearest: null }

  workspace.filteredServers.forEach((server) => {
    const billing = getServerCardViewModel(workspace.now, server).billing
    if (!billing.remainingTime) return
    overview.tracked += 1

    if (billing.remainingTime.type === "expired") {
      overview.expired += 1
      return
    }
    if (billing.remainingTime.type === "infinity") {
      overview.perpetual += 1
      return
    }

    const days = Number(billing.remainingDays?.num)
    if (!Number.isFinite(days)) return
    if (days <= 30) overview.expiringSoon += 1
    if (!overview.nearest || days < overview.nearest.days) {
      overview.nearest = { name: server.name, days, endDate: billing.endDateText }
    }
  })

  return overview
}

function StatusNodeRow({ now, server }: { now: number; server: NezhaServer }) {
  const viewModel = useMemo(() => getServerCardViewModel(now, server), [now, server])
  const billing = viewModel.billing.remainingTime
  const remainingText = billing?.type === "days" ? `剩余 ${billing.value}` : billing?.value || "未配置"

  return (
    <Link to={`/server/${serverIdToServerKey(server.id)}`} className="status-node-row" aria-label={`查看 ${server.name} 状态详情`}>
      <div className="status-node-row__identity">
        <span className={cn("probe-status-dot", { "probe-status-dot--offline": !viewModel.info.online })} />
        <ServerFlag country_code={viewModel.info.country_code} className="status-node-row__flag" />
        <span>
          <strong>{server.name}</strong>
          <small>{viewModel.info.online ? "运行正常" : "暂时离线"}</small>
        </span>
      </div>
      <div className="status-node-row__network" aria-label="实时速度">
        <span>
          <i className="ri-arrow-down-line" aria-hidden="true" />
          <strong>{viewModel.realtime.inSpeed.value}</strong>
          {viewModel.realtime.inSpeed.unit}/s
        </span>
        <span>
          <i className="ri-arrow-up-line" aria-hidden="true" />
          <strong>{viewModel.realtime.outSpeed.value}</strong>
          {viewModel.realtime.outSpeed.unit}/s
        </span>
      </div>
      <div className="status-node-row__billing">
        <span>{billing ? viewModel.billing.endDateText || "长期有效" : "未设置到期"}</span>
        <strong className={cn({ "status-node-row__expired": billing?.type === "expired" })}>{remainingText}</strong>
      </div>
      <i className="ri-arrow-right-s-line status-node-row__arrow" aria-hidden="true" />
    </Link>
  )
}

export default function Servers() {
  const workspace = useOutletContext<ServerWorkspaceValue>()
  const availability = workspace.totalCounts.total > 0 ? (workspace.totalCounts.online / workspace.totalCounts.total) * 100 : 0
  const resourceSummaries = useMemo(() => getResourceSummaries(workspace), [workspace])
  const billingOverview = useMemo(() => getBillingOverview(workspace), [workspace])
  const networkStats = useMemo(() => getServerHeaderStats(workspace.now, workspace.filteredServers), [workspace.filteredServers, workspace.now])
  const visibleNodes = workspace.filteredServers.slice(0, 6)
  const extraNodeCount = Math.max(workspace.filteredServers.length - visibleNodes.length, 0)
  const overallState = workspace.totalCounts.total === 0 ? "empty" : workspace.totalCounts.offline > 0 ? "attention" : "operational"
  const overallLabel =
    overallState === "empty" ? "暂无节点数据" : overallState === "attention" ? `${workspace.totalCounts.offline} 台节点需要关注` : "所有节点运行正常"
  const updatedTime = new Date(workspace.now).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

  return (
    <div className="status-page">
      <section className="status-hero" aria-labelledby="system-status-title">
        <span className="status-hero__mark" aria-hidden="true">
          <i className="ri-pulse-line" />
        </span>
        <h1 id="system-status-title">系统状态</h1>
        <div className={cn("status-hero__state", `status-hero__state--${overallState}`)}>
          <span className={cn("probe-status-dot", { "probe-status-dot--offline": overallState === "attention" })} />
          {overallLabel}
        </div>
        <p>最后更新 {updatedTime}，实时连接自动同步</p>
      </section>

      {workspace.totalCounts.offline > 0 ? (
        <section className="status-notice" role="status">
          <i className="ri-error-warning-line" aria-hidden="true" />
          <div>
            <strong>部分节点连接异常</strong>
            <p>检测到 {workspace.totalCounts.offline} 台节点暂时离线，在线节点仍持续上报实时数据。</p>
          </div>
        </section>
      ) : null}

      <section className="status-panel status-network-panel" aria-labelledby="live-network-title">
        <div className="status-panel__header">
          <div>
            <h2 id="live-network-title">实时网络</h2>
            <span>{workspace.filteredServers.length} 台筛选节点的当前吞吐</span>
          </div>
          <span className="status-panel__live">实时</span>
        </div>
        <div className="status-network-grid">
          <div className="status-network-metric status-network-metric--down">
            <span>
              <i className="ri-arrow-down-line" aria-hidden="true" /> 当前下行
            </span>
            <strong>
              {networkStats.netSpeed.inData.value}
              <small>{networkStats.netSpeed.inData.unit}/s</small>
            </strong>
            <small>
              今日流量 {networkStats.transfer.inData.value}
              {networkStats.transfer.inData.unit}
            </small>
          </div>
          <div className="status-network-metric status-network-metric--up">
            <span>
              <i className="ri-arrow-up-line" aria-hidden="true" /> 当前上行
            </span>
            <strong>
              {networkStats.netSpeed.outData.value}
              <small>{networkStats.netSpeed.outData.unit}/s</small>
            </strong>
            <small>
              今日流量 {networkStats.transfer.outData.value}
              {networkStats.transfer.outData.unit}
            </small>
          </div>
        </div>
      </section>

      <section className="status-panel status-current" aria-labelledby="current-status-title">
        <div className="status-panel__header">
          <div>
            <h2 id="current-status-title">节点状态</h2>
            <span>速度、连接状态与续费周期</span>
          </div>
          <span>
            {workspace.filteredCounts.online}/{workspace.filteredCounts.total} 在线
          </span>
        </div>
        <div className="status-current__list">
          {visibleNodes.length > 0 ? (
            visibleNodes.map((server) => <StatusNodeRow key={server.id} now={workspace.now} server={server} />)
          ) : (
            <div className="status-current__empty">当前筛选条件下没有节点</div>
          )}
        </div>
        {extraNodeCount > 0 ? <p className="status-current__more">另有 {extraNodeCount} 台节点可在左侧列表中查看</p> : null}
      </section>

      <section className="status-facts" aria-label="运行概览">
        <div>
          <strong>{availability.toFixed(1)}%</strong>
          <span>当前在线率</span>
        </div>
        <div>
          <strong>{workspace.totalCounts.online}</strong>
          <span>在线节点</span>
        </div>
        <div>
          <strong>{billingOverview.tracked}</strong>
          <span>已配置到期</span>
        </div>
        <div>
          <strong>{billingOverview.expiringSoon + billingOverview.expired}</strong>
          <span>续费提醒</span>
        </div>
      </section>

      <section className="status-panel status-billing" aria-labelledby="billing-title">
        <div className="status-panel__header">
          <div>
            <h2 id="billing-title">到期与续费</h2>
            <span>基于节点公开备注中的账单周期</span>
          </div>
        </div>
        {billingOverview.tracked > 0 ? (
          <div className="status-billing__body">
            <div className="status-billing__nearest">
              <span>最近到期</span>
              {billingOverview.nearest ? (
                <>
                  <strong>{billingOverview.nearest.days} 天</strong>
                  <small>
                    {billingOverview.nearest.name}，到期 {billingOverview.nearest.endDate}
                  </small>
                </>
              ) : (
                <>
                  <strong>{billingOverview.expired > 0 ? "已过期" : "长期有效"}</strong>
                  <small>{billingOverview.expired > 0 ? `${billingOverview.expired} 台节点需要处理` : "当前没有近期到期节点"}</small>
                </>
              )}
            </div>
            <div className="status-billing__counts">
              <span>
                <strong>{billingOverview.expiringSoon}</strong> 30 天内到期
              </span>
              <span>
                <strong>{billingOverview.expired}</strong> 已过期
              </span>
              <span>
                <strong>{billingOverview.perpetual}</strong> 长期有效
              </span>
            </div>
          </div>
        ) : (
          <div className="status-billing__empty">
            <i className="ri-calendar-line" aria-hidden="true" />
            <span>尚未在节点公开备注中配置到期时间</span>
          </div>
        )}
      </section>

      <section className="status-panel status-resource" aria-labelledby="resource-title">
        <div className="status-panel__header">
          <div>
            <h2 id="resource-title">资源使用</h2>
            <span>在线节点平均值</span>
          </div>
        </div>
        <div className="status-resource__items">
          {resourceSummaries.map((resource) => (
            <div key={resource.type}>
              <span>{resource.label}</span>
              <strong>{resource.value}%</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
