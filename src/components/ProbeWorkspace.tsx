import SearchBox from "@/components/SearchBox"
import ServerNavigatorItem from "@/components/ServerNavigatorItem"
import { ServerSortBox } from "@/components/ServerSortBox"
import WorldMap from "@/components/WorldMap"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { type ServerWorkspaceValue, useServerWorkspace } from "@/hooks/use-server-workspace"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { useWorldMapSize } from "@/hooks/use-world-map-size"
import { loginUserQueryOptions, settingQueryOptions } from "@/lib/query-options"
import { serverIdToServerKey } from "@/lib/server-key"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"

type DashboardLinkState = {
  icon: string
  label: string
  description: string
  title: string
}

function useDashboardLinkState(): DashboardLinkState {
  const { setNeedReconnect } = useWebSocketContext()
  const previousLoginState = useRef<boolean | null>(null)
  const { data: userData, isFetched, isError } = useQuery(loginUserQueryOptions())
  const isLogin = isError ? false : userData ? !!userData.data?.id && !!document.cookie : false

  useEffect(() => {
    if (!isFetched && !isError) return
    if (previousLoginState.current !== null && previousLoginState.current !== isLogin) setNeedReconnect(true)
    previousLoginState.current = isLogin
  }, [isError, isFetched, isLogin, setNeedReconnect])

  return isLogin
    ? { icon: "ri-dashboard-3-line", label: "管理后台", description: "配置探针与节点", title: "访问管理后台" }
    : { icon: "ri-user-line", label: "登录后台", description: "登录与配置", title: "登录管理后台" }
}

function WorkspaceSidebar({
  workspace,
  dashboardLink,
  onOpenTransfer,
}: {
  workspace: ServerWorkspaceValue
  dashboardLink: DashboardLinkState
  onOpenTransfer: () => void
}) {
  const { data: settingData } = useQuery(settingQueryOptions())
  const siteName = settingData?.data?.config?.site_name || "哪吒探针"
  const statusItems = [
    { value: "all" as const, label: "全部状态", icon: "ri-pulse-line", count: workspace.totalCounts.total },
    { value: "online" as const, label: "在线节点", icon: "ri-checkbox-circle-line", count: workspace.totalCounts.online },
    { value: "offline" as const, label: "离线节点", icon: "ri-error-warning-line", count: workspace.totalCounts.offline },
  ]

  return (
    <aside className="probe-sidebar">
      <Link to="/" className="probe-brand" aria-label="返回节点概览">
        <span className="probe-brand__mark" aria-hidden="true">
          <i className="ri-pulse-line" />
        </span>
        <span className="probe-brand__copy">
          <strong>{siteName}</strong>
          <small>节点监控工作区</small>
        </span>
      </Link>

      <div className="probe-sidebar__scroll">
        <nav className="probe-sidebar__nav" aria-label="探针导航">
          <NavLink
            to="/"
            end
            className={({ isActive }) => cn("probe-sidebar__link probe-sidebar__link--overview", { "probe-sidebar__link--active": isActive })}
          >
            <i className="ri-dashboard-line" aria-hidden="true" />
            <span>节点概览</span>
          </NavLink>
        </nav>

        <section className="probe-sidebar__section">
          <h2>运行状态</h2>
          <div className="probe-sidebar__menu">
            {statusItems.map((item) => (
              <button
                type="button"
                key={item.value}
                className={cn("probe-sidebar__link", { "probe-sidebar__link--active": workspace.status === item.value })}
                onClick={() => workspace.setStatus(item.value)}
              >
                <i className={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
                <small>{item.count}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="probe-sidebar__section">
          <h2>节点分组</h2>
          <div className="probe-sidebar__menu">
            {workspace.groups.map((group) => (
              <button
                type="button"
                key={group.key}
                className={cn("probe-sidebar__link", { "probe-sidebar__link--active": workspace.currentGroup === group.value })}
                onClick={() => workspace.setCurrentGroup(group.value)}
              >
                <i className={group.value ? "ri-folder-3-line" : "ri-server-line"} aria-hidden="true" />
                <span>{group.label}</span>
                <small>{group.count}</small>
              </button>
            ))}
          </div>
          {workspace.isGroupError ? <p className="probe-sidebar__error">分组暂时不可用</p> : null}
        </section>
      </div>

      <div className="probe-sidebar__footer">
        <button type="button" className="probe-sidebar__footer-link" title="查看今日流量" onClick={onOpenTransfer}>
          <i className="ri-exchange-2-line" aria-hidden="true" />
          <span>
            <strong>今日流量</strong>
            <small>
              下行 {workspace.headerStats.transfer.inData.value}
              {workspace.headerStats.transfer.inData.unit} · 上行 {workspace.headerStats.transfer.outData.value}
              {workspace.headerStats.transfer.outData.unit}
            </small>
          </span>
        </button>
        <a href="/dashboard" target="_blank" rel="noopener noreferrer" className="probe-sidebar__footer-link" title={dashboardLink.title}>
          <i className={dashboardLink.icon} aria-hidden="true" />
          <span>
            <strong>{dashboardLink.label}</strong>
            <small>{dashboardLink.description}</small>
          </span>
        </a>
      </div>
    </aside>
  )
}

function ServerBrowser({ workspace, activeKey, onOpenMap }: { workspace: ServerWorkspaceValue; activeKey?: string; onOpenMap: () => void }) {
  return (
    <section className="probe-browser" aria-label="节点列表">
      <header className="probe-browser__header">
        <div className="probe-browser__title-row">
          <div>
            <h1>节点</h1>
            <span>{workspace.filteredServers.length} 台</span>
          </div>
          <button type="button" className="probe-icon-button" onClick={onOpenMap} aria-label="查看节点地图" title="节点地图">
            <i className="ri-map-2-line" aria-hidden="true" />
          </button>
        </div>

        <div className="probe-browser__summary" aria-label="节点状态统计">
          <button
            type="button"
            className={cn({ "probe-browser__summary-active": workspace.status === "all" })}
            aria-pressed={workspace.status === "all"}
            onClick={() => workspace.setStatus("all")}
          >
            <strong>{workspace.totalCounts.total}</strong> 节点
          </button>
          <button
            type="button"
            className={cn("probe-browser__summary-online", { "probe-browser__summary-active": workspace.status === "online" })}
            aria-pressed={workspace.status === "online"}
            onClick={() => workspace.setStatus("online")}
          >
            <strong>{workspace.totalCounts.online}</strong> 在线
          </button>
          <button
            type="button"
            className={cn("probe-browser__summary-offline", { "probe-browser__summary-active": workspace.status === "offline" })}
            aria-pressed={workspace.status === "offline"}
            onClick={() => workspace.setStatus("offline")}
          >
            <strong>{workspace.totalCounts.offline}</strong> 离线
          </button>
        </div>

        <div className="probe-browser__toolbar">
          <label className="probe-browser__search">
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
                className="probe-icon-button probe-browser__group-filter"
                aria-label={`节点分组：${workspace.groups.find((group) => group.value === workspace.currentGroup)?.label || "全部节点"}`}
                title="节点分组"
              >
                <i className="ri-filter-3-line" aria-hidden="true" />
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
      </header>

      <div className="probe-browser__list">
        {workspace.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <div className="probe-node-skeleton" key={index} />)
        ) : workspace.filteredServers.length > 0 ? (
          workspace.filteredServers.map((server) => (
            <ServerNavigatorItem key={server.id} now={workspace.now} server={server} active={activeKey === serverIdToServerKey(server.id)} />
          ))
        ) : (
          <div className="probe-browser__empty">
            <i className="ri-server-line" aria-hidden="true" />
            <strong>没有匹配的节点</strong>
            <span>调整分组、状态或搜索条件</span>
          </div>
        )}
      </div>
    </section>
  )
}

function TransferDialog({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: ServerWorkspaceValue
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-dialog probe-transfer-dialog">
        <DialogTitle className="dashboard-dialog__title">今日流量</DialogTitle>
        <DialogDescription className="dashboard-dialog__description">统计周期 00:00 至 23:59</DialogDescription>
        <div className="dashboard-transfer-list">
          {workspace.dailyTransferList.length > 0 ? (
            workspace.dailyTransferList.map((item) => (
              <div key={item.id} className="dashboard-transfer-row">
                <div className="dashboard-transfer-row__name">
                  <span className={cn("probe-status-dot", { "probe-status-dot--offline": !item.online })} />
                  <span>{item.name}</span>
                </div>
                <div className="dashboard-transfer-row__values">
                  <span title={item.transferInTitle}>
                    <i className="ri-download-line" aria-hidden="true" /> {item.transferIn}
                  </span>
                  <span title={item.transferOutTitle}>
                    <i className="ri-upload-line" aria-hidden="true" /> {item.transferOut}
                  </span>
                  <span title={item.transferTotalTitle}>
                    <i className="ri-exchange-line" aria-hidden="true" /> {item.transferTotal}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="dashboard-empty">暂无流量数据</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MapDialog({ workspace, open, onOpenChange }: { workspace: ServerWorkspaceValue; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { width } = useWorldMapSize()
  const mapWidth = Math.min(width, 760)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-dialog probe-map-dialog">
        <DialogTitle className="dashboard-dialog__title">节点地图</DialogTitle>
        <DialogDescription className="dashboard-dialog__description">当前筛选中的在线节点分布</DialogDescription>
        <div className="probe-map-dialog__canvas">
          {workspace.locations.length > 0 ? (
            <WorldMap locations={workspace.locations} mapWidth={mapWidth} />
          ) : (
            <div className="dashboard-empty">暂无在线节点位置</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MobileHeader({ workspace, onOpenTransfer }: { workspace: ServerWorkspaceValue; onOpenTransfer: () => void }) {
  const { data: settingData } = useQuery(settingQueryOptions())
  const siteName = settingData?.data?.config?.site_name || "哪吒探针"
  return (
    <header className="probe-mobile-header">
      <Link to="/" className="probe-mobile-header__brand">
        <span className="probe-brand__mark" aria-hidden="true">
          <i className="ri-pulse-line" />
        </span>
        <span>
          <strong>{siteName}</strong>
          <small>{workspace.totalCounts.online} 台在线</small>
        </span>
      </Link>
      <div className="probe-mobile-header__actions">
        <button type="button" className="probe-icon-button" onClick={onOpenTransfer} aria-label="查看今日流量">
          <i className="ri-exchange-2-line" aria-hidden="true" />
        </button>
        <div className="probe-mobile-search">
          <SearchBox />
        </div>
      </div>
    </header>
  )
}

function MobileNavigation({ dashboardLink, onOpenMap }: { dashboardLink: DashboardLinkState; onOpenMap: () => void }) {
  return (
    <nav className="probe-mobile-nav" aria-label="移动端导航">
      <Link to="/">
        <i className="ri-server-line" aria-hidden="true" />
        <span>节点</span>
      </Link>
      <button type="button" className="probe-mobile-nav__map" onClick={onOpenMap} aria-label="打开节点地图">
        <span>
          <i className="ri-map-2-line" aria-hidden="true" />
        </span>
        <small>地图</small>
      </button>
      <a href="/dashboard" target="_blank" rel="noopener noreferrer" title={dashboardLink.title}>
        <i className={dashboardLink.icon} aria-hidden="true" />
        <span>{dashboardLink.label}</span>
      </a>
    </nav>
  )
}

export default function ProbeWorkspace() {
  const workspace = useServerWorkspace()
  const location = useLocation()
  const dashboardLink = useDashboardLinkState()
  const { data: settingData } = useQuery(settingQueryOptions())
  const [showTransfer, setShowTransfer] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const activeKey = location.pathname.match(/\/server\/([^/]+)/)?.[1]
  const home = location.pathname === "/"

  useEffect(() => {
    document.title = settingData?.data?.config?.site_name || "哪吒探针"
  }, [settingData?.data?.config?.site_name])

  return (
    <div className={cn("probe-workspace", home ? "probe-workspace--home" : "probe-workspace--detail")}>
      <MobileHeader workspace={workspace} onOpenTransfer={() => setShowTransfer(true)} />
      <WorkspaceSidebar workspace={workspace} dashboardLink={dashboardLink} onOpenTransfer={() => setShowTransfer(true)} />
      <ServerBrowser workspace={workspace} activeKey={activeKey} onOpenMap={() => setShowMap(true)} />
      <main className="probe-main">
        <Outlet context={workspace} />
      </main>
      <MobileNavigation dashboardLink={dashboardLink} onOpenMap={() => setShowMap(true)} />
      <TransferDialog workspace={workspace} open={showTransfer} onOpenChange={setShowTransfer} />
      <MapDialog workspace={workspace} open={showMap} onOpenChange={setShowMap} />
    </div>
  )
}
