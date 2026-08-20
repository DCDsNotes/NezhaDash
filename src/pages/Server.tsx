import ServerNavigatorItem from "@/components/ServerNavigatorItem"
import { ServerSortBox } from "@/components/ServerSortBox"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { type ServerWorkspaceValue } from "@/hooks/use-server-workspace"
import { serverIdToServerKey } from "@/lib/server-key"
import { getServerCardViewModel, getServerStatus } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import dayjs from "dayjs"
import { useMemo, useState } from "react"
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
  renewals: { id: number; name: string; endDate: string; days: number | null; expired: boolean }[]
}

function getResourceSummaries(now: number, servers: ServerWorkspaceValue["filteredServers"]): ResourceSummary[] {
  const onlineServers = servers.filter((server) => getServerStatus(now, server) === "online")
  const resources = [
    { type: "cpu", label: "CPU" },
    { type: "mem", label: "内存" },
    { type: "disk", label: "硬盘" },
  ]
  const totals = new Map(resources.map((resource) => [resource.type, { sum: 0, count: 0 }]))

  onlineServers.forEach((server) => {
    getServerCardViewModel(now, server).rings.forEach((ring) => {
      const total = totals.get(ring.type)
      if (!total || !Number.isFinite(ring.used)) return
      total.sum += ring.used
      total.count += 1
    })
  })

  return resources.map((resource) => {
    const total = totals.get(resource.type)
    const average = total?.count ? total.sum / total.count : 0
    return { ...resource, value: Number(average.toFixed(1)) }
  })
}

function getBillingOverview(now: number, servers: ServerWorkspaceValue["servers"]): BillingOverview {
  const overview: BillingOverview = { tracked: 0, expiringSoon: 0, expired: 0, perpetual: 0, nearest: null, renewals: [] }

  servers.forEach((server) => {
    const billing = getServerCardViewModel(now, server).billing
    if (!billing.remainingTime) return
    overview.tracked += 1

    if (billing.remainingTime.type === "expired") {
      overview.expired += 1
      overview.renewals.push({ id: server.id, name: server.name, endDate: billing.endDateText, days: null, expired: true })
      return
    }
    if (billing.remainingTime.type === "infinity") {
      overview.perpetual += 1
      return
    }

    const days = Number(billing.remainingDays?.num)
    if (!Number.isFinite(days)) return
    if (days <= 30) {
      overview.expiringSoon += 1
      overview.renewals.push({ id: server.id, name: server.name, endDate: billing.endDateText, days, expired: false })
    }
    if (!overview.nearest || days < overview.nearest.days) {
      overview.nearest = { name: server.name, days, endDate: billing.endDateText }
    }
  })

  overview.renewals.sort((a, b) => {
    if (a.expired !== b.expired) return a.expired ? 1 : -1
    if (a.days === null) return 1
    if (b.days === null) return -1
    return a.days - b.days
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
          <DropdownMenuContent align="end" collisionPadding={8} className="server-sort-dropdown">
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
  const [renewalOpen, setRenewalOpen] = useState(false)
  const availability = workspace.totalCounts.total > 0 ? (workspace.totalCounts.online / workspace.totalCounts.total) * 100 : 0
  const resourceSummaries = useMemo(() => getResourceSummaries(workspace.now, workspace.filteredServers), [workspace.filteredServers, workspace.now])
  const billingOverview = useMemo(() => getBillingOverview(workspace.now, workspace.servers), [workspace.now, workspace.servers])
  const networkStats = workspace.headerStats
  const overallState = workspace.totalCounts.total === 0 ? "empty" : workspace.totalCounts.offline > 0 ? "attention" : "operational"
  const overallLabel =
    overallState === "empty" ? "暂无节点数据" : overallState === "attention" ? `${workspace.totalCounts.offline} 台节点需要关注` : "所有节点运行正常"
  const updatedTime = dayjs(workspace.now).format("YYYY-MM-DD HH:mm:ss")

  return (
    <div className="status-page">
      <section className="status-hero" aria-labelledby="system-status-title">
        <span className={cn("status-hero__mark", { "status-hero__mark--attention": overallState === "attention" })} aria-hidden="true">
          <i className="ri-pulse-line" />
        </span>
        <h1 id="system-status-title">系统状态</h1>
        <div className={cn("status-hero__state", `status-hero__state--${overallState}`)}>
          <span className={cn("probe-status-dot", { "probe-status-dot--offline": overallState === "attention" })} />
          {overallLabel}
        </div>
        <p>最后更新：{updatedTime}</p>
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
            <p>{workspace.totalCounts.total} 台服务器的当前吞吐</p>
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
              累计流量 {networkStats.transfer.inData.value} {networkStats.transfer.inData.unit}
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
              累计流量 {networkStats.transfer.outData.value} {networkStats.transfer.outData.unit}
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
            {workspace.totalCounts.online}/{workspace.totalCounts.total} 在线
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
        <button
          type="button"
          className="status-facts__action"
          onClick={() => setRenewalOpen(true)}
          aria-label={`查看续费提醒，${billingOverview.renewals.length} 台服务器`}
        >
          <strong>{billingOverview.expiringSoon + billingOverview.expired}</strong>
          <span>续费提醒</span>
        </button>
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

      <Dialog open={renewalOpen} onOpenChange={setRenewalOpen}>
        <DialogContent className="dashboard-dialog status-renewal-dialog">
          <DialogTitle className="dashboard-dialog__title">续费提醒</DialogTitle>
          <DialogDescription className="dashboard-dialog__description">以下服务器将在 30 天内到期或已经过期</DialogDescription>
          <div className="status-renewal-list">
            {billingOverview.renewals.length > 0 ? (
              billingOverview.renewals.map((item) => (
                <Link
                  key={item.id}
                  to={`/server/${serverIdToServerKey(item.id)}`}
                  className="status-renewal-list__item"
                  onClick={() => {
                    sessionStorage.setItem("fromMainPage", "true")
                    setRenewalOpen(false)
                  }}
                >
                  <span className="status-renewal-list__name">
                    <i className={cn("ri-error-warning-line", { "status-renewal-list__icon--expired": item.expired })} aria-hidden="true" />
                    <strong>{item.name}</strong>
                  </span>
                  <span className="status-renewal-list__meta">
                    <small>{item.endDate || "未设置"}</small>
                    <strong className={cn({ "status-renewal-list__days--expired": item.expired })}>
                      {item.expired ? "已过期" : `剩余 ${item.days} 天`}
                    </strong>
                  </span>
                  <i className="ri-arrow-right-s-line status-renewal-list__arrow" aria-hidden="true" />
                </Link>
              ))
            ) : (
              <div className="status-renewal-list__empty">当前没有需要续费的服务器</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
