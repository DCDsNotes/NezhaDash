import ServerNavigatorItem from "@/components/ServerNavigatorItem"
import { ServerSortBox } from "@/components/ServerSortBox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { type ServerWorkspaceValue } from "@/hooks/use-server-workspace"
import { getServerCardViewModel, getServerHeaderStats, getServerStatus } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { useOutletContext } from "react-router-dom"

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
    { type: "disk", label: "硬盘" },
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

function StatusControls({ workspace }: { workspace: ServerWorkspaceValue }) {
  const statusOptions = [
    { value: "all" as const, label: "全部状态", count: workspace.totalCounts.total },
    { value: "online" as const, label: "在线节点", count: workspace.totalCounts.online },
    { value: "offline" as const, label: "离线节点", count: workspace.totalCounts.offline },
  ]

  return (
    <div className="status-controls">
      <div className="status-controls__states" aria-label="节点状态筛选">
        {statusOptions.map((item) => (
          <button
            type="button"
            key={item.value}
            className={cn({ "status-controls__state--active": workspace.status === item.value })}
            aria-pressed={workspace.status === item.value}
            onClick={() => workspace.setStatus(item.value)}
          >
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </div>

      <div className="status-controls__toolbar">
        <label className="status-controls__search">
          <span className="sr-only">搜索节点</span>
          <i className="ri-search-line" aria-hidden="true" />
          <input
            type="search"
            value={workspace.searchWord}
            placeholder="搜索节点"
            onChange={(event) => workspace.setSearchWord(event.target.value)}
          />
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="status-controls__button"
              aria-label={`节点分组：${workspace.groups.find((group) => group.value === workspace.currentGroup)?.label || "全部节点"}`}
              title="节点分组"
            >
              <i className="ri-filter-3-line" aria-hidden="true" />
              <span>{workspace.groups.find((group) => group.value === workspace.currentGroup)?.label || "全部节点"}</span>
              <i className="ri-arrow-down-s-line" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="server-sort-dropdown">
            <DropdownMenuRadioGroup value={workspace.currentGroup} onValueChange={workspace.setCurrentGroup}>
              {workspace.groups.map((group) => (
                <DropdownMenuRadioItem key={group.key} value={group.value} className="server-sort-dropdown__item [&>span:first-child]:hidden">
                  <span className="server-sort-dropdown__label">{group.label}</span>
                  <small className="probe-group-menu__count">{group.count}</small>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <ServerSortBox
          value={{ prop: workspace.sortProp, order: workspace.sortOrder }}
          onChange={(value) => {
            workspace.setSortProp(value.prop)
            workspace.setSortOrder(value.order)
          }}
          options={workspace.sortOptions}
        />
      </div>

      {workspace.isGroupError ? <p className="status-controls__error">节点分组暂时不可用</p> : null}
    </div>
  )
}

export default function Servers() {
  const workspace = useOutletContext<ServerWorkspaceValue>()
  const availability = workspace.totalCounts.total > 0 ? (workspace.totalCounts.online / workspace.totalCounts.total) * 100 : 0
  const resourceSummaries = useMemo(() => getResourceSummaries(workspace), [workspace])
  const billingOverview = useMemo(() => getBillingOverview(workspace), [workspace])
  const networkStats = useMemo(() => getServerHeaderStats(workspace.now, workspace.filteredServers), [workspace.filteredServers, workspace.now])
  const overallState = workspace.totalCounts.total === 0 ? "empty" : workspace.totalCounts.offline > 0 ? "attention" : "operational"
  const overallLabel =
    overallState === "empty" ? "暂无节点数据" : overallState === "attention" ? `${workspace.totalCounts.offline} 台节点需要关注` : "所有节点运行正常"
  const updatedTime = new Date(workspace.now).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

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
        <p>最后更新：{updatedTime}（实时连接自动同步）</p>
      </section>

      {workspace.totalCounts.offline > 0 ? (
        <section className="status-notice" role="status">
          <i className="ri-error-warning-line" aria-hidden="true" />
          <div>
            <strong>部分节点连接异常</strong>
            <p>检测到 {workspace.totalCounts.offline} 台节点暂时离线，在线节点仍在持续上报数据。</p>
          </div>
        </section>
      ) : null}

      <section className="status-panel status-network" aria-labelledby="network-status-title">
        <div className="status-panel__header">
          <div>
            <h2 id="network-status-title">实时网络</h2>
            <p>{workspace.filteredCounts.total} 台服务器的当前吞吐</p>
          </div>
          <span className="status-panel__live">
            <span className="probe-status-dot" /> 实时
          </span>
        </div>

        <div className="status-network__grid">
          <div className="status-network__metric status-network__metric--down">
            <span>
              <i className="ri-arrow-down-line" aria-hidden="true" /> 当前下行
            </span>
            <strong>
              {networkStats.netSpeed.inData.value}
              <small>{networkStats.netSpeed.inData.unit}/s</small>
            </strong>
            <p>
              今日流量 {networkStats.transfer.inData.value} {networkStats.transfer.inData.unit}
            </p>
          </div>
          <div className="status-network__metric status-network__metric--up">
            <span>
              <i className="ri-arrow-up-line" aria-hidden="true" /> 当前上行
            </span>
            <strong>
              {networkStats.netSpeed.outData.value}
              <small>{networkStats.netSpeed.outData.unit}/s</small>
            </strong>
            <p>
              今日流量 {networkStats.transfer.outData.value} {networkStats.transfer.outData.unit}
            </p>
          </div>
        </div>
      </section>

      <section className="status-panel status-current" aria-labelledby="current-status-title">
        <div className="status-panel__header">
          <div>
            <h2 id="current-status-title">节点状态</h2>
            <p>实时速度、资源占用与续费周期</p>
          </div>
          <span>
            {workspace.filteredCounts.online}/{workspace.filteredCounts.total} 在线
          </span>
        </div>

        <StatusControls workspace={workspace} />

        <div className="status-current__list">
          {workspace.isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <div className="probe-node-skeleton" key={index} />)
          ) : workspace.filteredServers.length > 0 ? (
            workspace.filteredServers.map((server) => <ServerNavigatorItem key={server.id} now={workspace.now} server={server} active={false} />)
          ) : (
            <div className="status-current__empty">
              <i className="ri-server-line" aria-hidden="true" />
              <strong>没有匹配的节点</strong>
              <span>请调整状态、分组或搜索条件</span>
            </div>
          )}
        </div>
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
            <p>基于节点公开备注中的账单周期</p>
          </div>
        </div>
        <div className="status-billing__body">
          <div className="status-billing__nearest">
            <span>最近到期</span>
            {billingOverview.nearest ? (
              <>
                <strong>{billingOverview.nearest.days} 天</strong>
                <p>
                  {billingOverview.nearest.name}，到期 {billingOverview.nearest.endDate}
                </p>
              </>
            ) : (
              <>
                <strong>{billingOverview.tracked > 0 ? "长期" : "暂无"}</strong>
                <p>{billingOverview.tracked > 0 ? "当前没有临近到期节点" : "尚未配置节点到期时间"}</p>
              </>
            )}
          </div>
          <div className="status-billing__counts">
            <span>
              <strong>{billingOverview.expiringSoon}</strong>30 天内到期
            </span>
            <span>
              <strong>{billingOverview.expired}</strong>已过期
            </span>
            <span>
              <strong>{billingOverview.perpetual}</strong>长期有效
            </span>
          </div>
        </div>
      </section>

      <section className="status-panel status-resources" aria-labelledby="resource-title">
        <div className="status-panel__header">
          <div>
            <h2 id="resource-title">资源使用</h2>
            <p>当前在线节点的平均资源占用</p>
          </div>
        </div>
        <div className="status-resources__grid">
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
