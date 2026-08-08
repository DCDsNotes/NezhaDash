import SearchBox from "@/components/SearchBox"
import WorldMap, { buildLocationsFromServers } from "@/components/WorldMap"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { type ServerWorkspaceValue, useServerWorkspace } from "@/hooks/use-server-workspace"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { useWorldMapSize } from "@/hooks/use-world-map-size"
import { loginUserQueryOptions, settingQueryOptions } from "@/lib/query-options"
import { getServerDailyTransferList, getServerStatus } from "@/lib/server-view-model"
import { resolveSiteName } from "@/lib/site-name"
import { cn } from "@/lib/utils"
import { preloadWorldMapImage } from "@/lib/world-map"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, Outlet } from "react-router-dom"

type DashboardLinkState = {
  icon: string
  label: string
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
    ? { icon: "ri-dashboard-3-line", label: "管理后台", title: "访问管理后台" }
    : { icon: "ri-user-line", label: "登录后台", title: "登录管理后台" }
}

function SiteHeader({
  dashboardLink,
  onOpenMap,
  onPreloadMap,
  onOpenTransfer,
}: {
  dashboardLink: DashboardLinkState
  onOpenMap: () => void
  onPreloadMap: () => void
  onOpenTransfer: () => void
}) {
  const { data: settingData } = useQuery(settingQueryOptions())
  const siteName = resolveSiteName(settingData?.data?.config?.site_name)

  return (
    <header className="probe-site-header">
      <div className="probe-site-header__inner">
        <Link to="/" className="probe-site-brand" aria-label="返回系统状态">
          <span className="probe-site-brand__mark" aria-hidden="true">
            <i className="ri-pulse-line" />
          </span>
          <span>
            <strong>{siteName}</strong>
            <small>服务状态</small>
          </span>
        </Link>

        <nav className="probe-site-actions" aria-label="页面工具">
          <div className="probe-site-actions__search">
            <SearchBox />
          </div>
          <button type="button" className="probe-site-action" onClick={onOpenTransfer} aria-label="查看今日流量" title="查看今日流量">
            <i className="ri-exchange-2-line" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="probe-site-action"
            onClick={onOpenMap}
            onFocus={onPreloadMap}
            onPointerEnter={onPreloadMap}
            onTouchStart={onPreloadMap}
            aria-label="查看节点地图"
            title="查看节点地图"
          >
            <i className="ri-map-2-line" aria-hidden="true" />
          </button>
          <a
            className="probe-site-action probe-site-action--dashboard"
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={dashboardLink.label}
            title={dashboardLink.title}
          >
            <i className={dashboardLink.icon} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
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
  const dailyTransferList = useMemo(
    () => (open ? getServerDailyTransferList(workspace.now, workspace.servers) : []),
    [open, workspace.now, workspace.servers],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-dialog probe-transfer-dialog">
        <DialogTitle className="dashboard-dialog__title">今日流量</DialogTitle>
        <DialogDescription className="dashboard-dialog__description">统计周期 00:00 至 23:59</DialogDescription>
        <div className="dashboard-transfer-list">
          {dailyTransferList.length > 0 ? (
            dailyTransferList.map((item) => (
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
  const { width } = useWorldMapSize(open)
  const mapWidth = typeof window !== "undefined" && window.innerWidth > 900 ? Math.min(Math.max(width, 760), 900) : width
  const locations = useMemo(
    () =>
      open
        ? buildLocationsFromServers(
            workspace.filteredServers.map((server) => ({ ...server, online: getServerStatus(workspace.now, server) === "online" })),
          )
        : [],
    [open, workspace.filteredServers, workspace.now],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-dialog probe-map-dialog">
        <DialogTitle className="dashboard-dialog__title">节点地图</DialogTitle>
        <DialogDescription className="dashboard-dialog__description">当前筛选中的在线节点分布</DialogDescription>
        <div className="probe-map-dialog__canvas">
          {locations.length > 0 ? <WorldMap locations={locations} mapWidth={mapWidth} /> : <div className="dashboard-empty">暂无在线节点位置</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ProbeWorkspace() {
  const workspace = useServerWorkspace()
  const dashboardLink = useDashboardLinkState()
  const { data: settingData } = useQuery(settingQueryOptions())
  const [showTransfer, setShowTransfer] = useState(false)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    document.title = resolveSiteName(settingData?.data?.config?.site_name)
  }, [settingData?.data?.config?.site_name])

  function preloadMap() {
    void preloadWorldMapImage()
  }

  function openMap() {
    preloadMap()
    setShowMap(true)
  }

  return (
    <div className="probe-workspace">
      <SiteHeader dashboardLink={dashboardLink} onOpenMap={openMap} onPreloadMap={preloadMap} onOpenTransfer={() => setShowTransfer(true)} />
      <main className="probe-main">
        <Outlet context={workspace} />
      </main>
      <TransferDialog workspace={workspace} open={showTransfer} onOpenChange={setShowTransfer} />
      <MapDialog workspace={workspace} open={showMap} onOpenChange={setShowMap} />
    </div>
  )
}
