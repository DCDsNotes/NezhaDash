import PageScrollControls from "@/components/PageScrollControls"
import SearchBox from "@/components/SearchBox"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { type ServerWorkspaceValue, useServerWorkspace } from "@/hooks/use-server-workspace"
import { useWebSocketControls } from "@/hooks/use-websocket-context"
import { loginUserQueryOptions } from "@/lib/query-options"
import { preloadNetworkDiagnostics } from "@/lib/route-preload"
import { serverIdToServerKey } from "@/lib/server-key"
import { getServerDailyTransferList } from "@/lib/server-view-model"
import { formatPageTitle, resolveSiteName } from "@/lib/site-name"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import { Link, Outlet, matchPath, useLocation } from "react-router-dom"

let mapDialogPromise: ReturnType<typeof importMapDialog> | null = null

function importMapDialog() {
  return import("@/components/MapDialog")
}

function loadMapDialog() {
  mapDialogPromise ||= importMapDialog()
  return mapDialogPromise
}

function preloadMapDialog() {
  void loadMapDialog().then(({ preloadMapAssets }) => preloadMapAssets())
}

const MapDialog = lazy(loadMapDialog)

type DashboardLinkState = {
  icon: string
  label: string
  title: string
}

function useDashboardLinkState(): DashboardLinkState {
  const { setNeedReconnect } = useWebSocketControls()
  const previousLoginState = useRef<boolean | null>(null)
  const { data: userData, isFetched, isError } = useQuery(loginUserQueryOptions())
  const isLogin = isError ? false : Boolean(userData?.data?.id)

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
  siteName,
  servers,
  onOpenMap,
  onPreloadMap,
  onOpenTransfer,
}: {
  dashboardLink: DashboardLinkState
  siteName: string
  servers: ServerWorkspaceValue["servers"]
  onOpenMap: () => void
  onPreloadMap: () => void
  onOpenTransfer: () => void
}) {
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
            <SearchBox servers={servers} />
          </div>
          <Link
            to="/network"
            className="probe-site-action"
            aria-label="IP 分流与泄露检测"
            title="IP 分流与泄露检测"
            onPointerEnter={() => void preloadNetworkDiagnostics()}
            onFocus={() => void preloadNetworkDiagnostics()}
          >
            <i className="ri-route-line" aria-hidden="true" />
          </Link>
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
  onOpenChange,
}: {
  workspace: ServerWorkspaceValue
  onOpenChange: (open: boolean) => void
}) {
  const dailyTransferList = useMemo(() => getServerDailyTransferList(workspace.now, workspace.servers), [workspace.now, workspace.servers])

  return (
    <Dialog open onOpenChange={onOpenChange}>
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

function getWorkspacePageName(pathname: string, workspace: Pick<ServerWorkspaceValue, "isLoading" | "servers">) {
  if (matchPath({ path: "/", end: true }, pathname) || matchPath({ path: "/error", end: true }, pathname)) return ""
  if (matchPath({ path: "/network", end: true }, pathname)) return "分流查询"

  const serverMatch = matchPath({ path: "/server/:serverKey", end: true }, pathname)
  if (!serverMatch) return "页面不存在"

  const serverName = workspace.servers.find((server) => serverIdToServerKey(server.id) === serverMatch.params.serverKey)?.name
  return serverName || (workspace.isLoading ? "" : "页面不存在")
}

function shouldRenderPageScrollControls(pathname: string) {
  return Boolean(
    matchPath({ path: "/", end: true }, pathname) ||
      matchPath({ path: "/server/:serverKey", end: true }, pathname) ||
      matchPath({ path: "/network", end: true }, pathname) ||
      matchPath({ path: "/error", end: true }, pathname),
  )
}

export default function ProbeWorkspace({ configuredSiteName }: { configuredSiteName?: string }) {
  const workspace = useServerWorkspace()
  const dashboardLink = useDashboardLinkState()
  const { pathname } = useLocation()
  const [showTransfer, setShowTransfer] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const siteName = resolveSiteName(configuredSiteName)
  const pageTitle = formatPageTitle(getWorkspacePageName(pathname, workspace), configuredSiteName)

  useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  function openMap() {
    preloadMapDialog()
    setShowMap(true)
  }

  return (
    <div className="probe-workspace">
      <SiteHeader
        dashboardLink={dashboardLink}
        siteName={siteName}
        servers={workspace.servers}
        onOpenMap={openMap}
        onPreloadMap={preloadMapDialog}
        onOpenTransfer={() => setShowTransfer(true)}
      />
      <main className="probe-main">
        <Outlet context={workspace} />
      </main>
      {shouldRenderPageScrollControls(pathname) ? <PageScrollControls /> : null}
      {showTransfer ? <TransferDialog workspace={workspace} onOpenChange={setShowTransfer} /> : null}
      {showMap ? (
        <Suspense fallback={null}>
          <MapDialog workspace={workspace} open onOpenChange={setShowMap} />
        </Suspense>
      ) : null}
    </div>
  )
}
