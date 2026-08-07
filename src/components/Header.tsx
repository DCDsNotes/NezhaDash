import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useNezhaWsData } from "@/hooks/use-nezha-ws-data"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { loginUserQueryOptions, settingQueryOptions } from "@/lib/query-options"
import { type ServerDailyTransferViewModel, getServerDailyTransferList, getServerHeaderStats, getServerStatusCounts } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, m } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { LoadingSpinner } from "./loading/loading-spinner"

function Header() {
  const { data: settingData } = useQuery(settingQueryOptions())
  const { data: parsedWsData } = useNezhaWsData()
  const [showTransferPanel, setShowTransferPanel] = useState(false)
  const siteName = settingData?.data?.config?.site_name || "哪吒探针"

  const serverCount = useMemo(() => {
    if (!parsedWsData?.servers) return null
    return getServerStatusCounts(parsedWsData.now, parsedWsData.servers)
  }, [parsedWsData])

  const serverStat = useMemo(() => {
    if (!parsedWsData?.servers) return null
    return getServerHeaderStats(parsedWsData.now, parsedWsData.servers)
  }, [parsedWsData])

  const dailyTransferList = useMemo(() => {
    if (!parsedWsData?.servers) return []
    return getServerDailyTransferList(parsedWsData.now, parsedWsData.servers)
  }, [parsedWsData])

  useEffect(() => {
    document.title = siteName
  }, [siteName])

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__inner">
        <Link to="/" className="dashboard-brand" aria-label="返回哪吒探针首页">
          <span className="dashboard-brand__mark" aria-hidden="true">
            <i className="ri-pulse-line" />
          </span>
          <span>
            <strong>{siteName}</strong>
            <small>实时节点监控</small>
          </span>
        </Link>

        <div className="dashboard-header__tools">
          {serverCount ? (
            <div className="dashboard-header__counts" aria-label={`共 ${serverCount.total} 台服务器`}>
              <span className="dashboard-count dashboard-count--online">
                <i className="ri-checkbox-blank-circle-fill" aria-hidden="true" />
                在线 {serverCount.online}
              </span>
              <span className="dashboard-count dashboard-count--offline">
                <i className="ri-checkbox-blank-circle-fill" aria-hidden="true" />
                离线 {serverCount.offline}
              </span>
            </div>
          ) : null}

          {serverStat ? (
            <Dialog open={showTransferPanel} onOpenChange={setShowTransferPanel}>
              <DialogTrigger asChild>
                <button type="button" className="dashboard-header__transfer" title="查看今日流量">
                  <span>今日流量</span>
                  <strong>
                    <i className="ri-arrow-down-line" aria-hidden="true" /> {serverStat.transfer.inData.value}
                  </strong>
                  <strong>
                    <i className="ri-arrow-up-line" aria-hidden="true" /> {serverStat.transfer.outData.value}
                  </strong>
                </button>
              </DialogTrigger>
              <ServerDailyTransferPanel list={dailyTransferList} />
            </Dialog>
          ) : null}

          <DashboardLink />
        </div>
      </div>
    </header>
  )
}

function ServerDailyTransferPanel({ list }: { list: ServerDailyTransferViewModel[] }) {
  return (
    <DialogContent className="dashboard-dialog dashboard-transfer-dialog">
      <DialogTitle className="dashboard-dialog__title">今日流量</DialogTitle>
      <DialogDescription className="dashboard-dialog__description">统计周期 00:00 至 23:59</DialogDescription>
      <div className="dashboard-transfer-list">
        {list.length > 0 ? (
          list.map((item) => (
            <div key={item.id} className="dashboard-transfer-row">
              <div className="dashboard-transfer-row__name">
                <span className={cn("dashboard-status-dot", { "dashboard-status-dot--offline": !item.online })} />
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
  )
}

export function RefreshToast() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { needReconnect } = useWebSocketContext()

  useEffect(() => {
    if (!needReconnect) return
    sessionStorage.removeItem("needRefresh")
    const timeoutId = window.setTimeout(() => navigate(0), 1000)
    return () => window.clearTimeout(timeoutId)
  }, [navigate, needReconnect])

  return (
    <AnimatePresence>
      {needReconnect ? (
        <m.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="dashboard-refresh-toast">
          <LoadingSpinner />
          <span>{t("refreshing")}...</span>
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

function DashboardLink() {
  const { setNeedReconnect } = useWebSocketContext()
  const previousLoginState = useRef<boolean | null>(null)
  const { data: userData, isFetched, isError } = useQuery(loginUserQueryOptions())
  const isLogin = isError ? false : userData ? !!userData.data?.id && !!document.cookie : false

  useEffect(() => {
    if (!isFetched && !isError) return
    if (previousLoginState.current !== null && previousLoginState.current !== isLogin) setNeedReconnect(true)
    previousLoginState.current = isLogin
  }, [isError, isFetched, isLogin, setNeedReconnect])

  return (
    <a href="/dashboard" className="dashboard-user-link" title={isLogin ? "访问管理后台" : "登录管理后台"} target="_blank" rel="noopener noreferrer">
      <i className={isLogin ? "ri-dashboard-3-line" : "ri-user-line"} aria-hidden="true" />
      <span>{isLogin ? "管理后台" : "登录"}</span>
    </a>
  )
}

export default Header
