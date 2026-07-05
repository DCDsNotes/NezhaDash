import { useNezhaWsData } from "@/hooks/use-nezha-ws-data"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { fetchLoginUser, fetchSetting } from "@/lib/nezha-api"
import { getServerDailyTransferList, getServerHeaderStats, getServerStatusCounts, type ServerDailyTransferViewModel } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, m } from "framer-motion"
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"

import { LoadingSpinner } from "./loading/loading-spinner"

function Header() {
  const navigate = useNavigate()

  const { data: settingData } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  const { data: parsedWsData } = useNezhaWsData()
  const [showTransferPanel, setShowTransferPanel] = useState(false)

  const siteName = settingData?.data?.config?.site_name

  const nezhaWsData = parsedWsData

  const serverCount = useMemo(() => {
    if (!nezhaWsData || !Array.isArray(nezhaWsData.servers)) {
      return null
    }
    return getServerStatusCounts(nezhaWsData.now, nezhaWsData.servers)
  }, [nezhaWsData?.now, nezhaWsData?.servers])

  const serverStat = useMemo(() => {
    if (!nezhaWsData || !Array.isArray(nezhaWsData.servers)) return null
    return getServerHeaderStats(nezhaWsData.now, nezhaWsData.servers)
  }, [nezhaWsData?.now, nezhaWsData?.servers])

  const dailyTransferList = useMemo(() => {
    if (!nezhaWsData || !Array.isArray(nezhaWsData.servers)) return []
    return getServerDailyTransferList(nezhaWsData.now, nezhaWsData.servers)
  }, [nezhaWsData?.now, nezhaWsData?.servers])

  useEffect(() => {
    document.title = siteName || "哪吒监控"
  }, [siteName])

  useEffect(() => {
    if (!showTransferPanel) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.stopPropagation()
      setShowTransferPanel(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [showTransferPanel])

  return (
    <div
      className={cn("layout-header", {
        "layout-header--show-server-stat": !!serverStat,
      })}
      style={
        {
          ["--layout-header-container-width" as `--${string}`]: "var(--list-container-width)",
        } as CSSProperties
      }
    >
      <div className="layer-header-container">
        <div className="left-box">
          <span
            className="site-name"
            onClick={() => {
              sessionStorage.removeItem("selectedGroup")
              navigate("/")
            }}
          >
            {siteName || "哪吒监控"}
          </span>
        </div>
        <div className="right-box">
          {serverCount?.total ? (
            <div className="server-count-group">
              <span className="server-count server-count--online" title="在线">
                <span className="icon ri-hard-drive-3-line" />
                <span className="value">{serverCount.online}</span>
              </span>
              <span className="server-count server-count--offline" title="离线">
                <span className="icon ri-hard-drive-3-line" />
                <span className="value">{serverCount.offline}</span>
              </span>
            </div>
          ) : null}

          {serverStat ? (
            <div className="server-stat-group" onClick={() => setShowTransferPanel(true)} title="查看今日各服务器流量">
              <div className="server-stat server-stat--transfer">
                <span className="server-stat-label">
                  <span className="text">今日</span>
                </span>
                <div className="server-stat-content">
                  <span className="server-stat-item server-stat-item--in">
                    <span className="ri-download-line" />
                    <span className="text-value">{serverStat.transfer.inData.value}</span>
                    <span className="text-unit">{serverStat.transfer.inData.unit}</span>
                  </span>
                  <span className="server-stat-item server-stat-item--out">
                    <span className="ri-upload-line" />
                    <span className="text-value">{serverStat.transfer.outData.value}</span>
                    <span className="text-unit">{serverStat.transfer.outData.unit}</span>
                  </span>
                </div>
              </div>
              <div className="server-stat server-stat--net-speed">
                <span className="server-stat-label">
                  <span className="text">网速</span>
                </span>
                <div className="server-stat-content">
                  <span className="server-stat-item server-stat-item--in">
                    <span className="ri-arrow-down-line" />
                    <span className="text-value">{serverStat.netSpeed.inData.value}</span>
                    <span className="text-unit">{serverStat.netSpeed.inData.unit}</span>
                  </span>
                  <span className="server-stat-item server-stat-item--out">
                    <span className="ri-arrow-up-line" />
                    <span className="text-value">{serverStat.netSpeed.outData.value}</span>
                    <span className="text-unit">{serverStat.netSpeed.outData.unit}</span>
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {showTransferPanel ? <ServerDailyTransferPanel list={dailyTransferList} onClose={() => setShowTransferPanel(false)} /> : null}

          <DashboardLink />
        </div>
      </div>
    </div>
  )
}

function ServerDailyTransferPanel({ list, onClose }: { list: ServerDailyTransferViewModel[]; onClose: () => void }) {
  return createPortal(
    <>
      <div className="server-search__backdrop" onClick={onClose} />
      <div className="server-search__panel server-transfer-panel">
        <div className="server-transfer-panel__head">
          <div className="server-transfer-panel__title">今日流量</div>
        </div>
        <div className="server-transfer-panel__sub">统计周期 0:00:00-23:59:59</div>
        <div className="server-transfer-panel__list">
          {list.map((item) => (
            <div key={item.id} className="server-transfer-panel__item">
              <div className="server-transfer-panel__name">
                <span className={cn("server-transfer-panel__dot", { "server-transfer-panel__dot--offline": !item.online })} />
                <span className="server-transfer-panel__name-text">{item.name}</span>
              </div>
              <div className="server-transfer-panel__values">
                <span className="server-transfer-panel__value server-transfer-panel__value--in" title={item.transferInTitle}>
                  <i className="ri-download-line" />
                  <span>{item.transferIn}</span>
                </span>
                <span className="server-transfer-panel__value server-transfer-panel__value--out" title={item.transferOutTitle}>
                  <i className="ri-upload-line" />
                  <span>{item.transferOut}</span>
                </span>
                <span className="server-transfer-panel__value server-transfer-panel__value--total" title={item.transferTotalTitle}>
                  <i className="ri-exchange-line" />
                  <span>{item.transferTotal}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body,
  )
}

export function RefreshToast() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { needReconnect } = useWebSocketContext()

  if (!needReconnect) {
    return null
  }

  if (needReconnect) {
    sessionStorage.removeItem("needRefresh")
    setTimeout(() => {
      navigate(0)
    }, 1000)
  }

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.8 }}
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.8 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="fixed left-1/2 top-8 z-[999] flex -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-solid bg-white px-2 py-1.5 shadow-xl shadow-black/5 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none"
      >
        <section className="flex items-center gap-1.5">
          <LoadingSpinner />
          <p className="text-[0.78125rem] font-medium">{t("refreshing")}...</p>
        </section>
      </m.div>
    </AnimatePresence>
  )
}

function DashboardLink() {
  const { setNeedReconnect } = useWebSocketContext()
  const previousLoginState = useRef<boolean | null>(null)
  const {
    data: userData,
    isFetched,
    isLoadingError,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["login-user"],
    queryFn: () => fetchLoginUser(),
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    refetchInterval: 1000 * 30,
    retry: 0,
  })

  const isLogin = isError ? false : userData ? !!userData?.data?.id && !!document.cookie : false

  if (isLoadingError) {
    previousLoginState.current = isLogin
  }

  useEffect(() => {
    refetch()
  }, [document.cookie])

  useEffect(() => {
    if (isFetched || isError) {
      // 只有当登录状态发生变化时才设置needReconnect
      if (previousLoginState.current !== null && previousLoginState.current !== isLogin) {
        setNeedReconnect(true)
      }
      previousLoginState.current = isLogin
    }
  }, [isLogin])

  return (
    <div className="nezha-user-info-group">
      <a href={"/dashboard"} className="dashboard-url" title={isLogin ? "访问管理后台" : "登录管理后台"} target="_blank" rel="noopener noreferrer">
        <span className={cn({ "ri-dashboard-3-line": isLogin, "ri-user-line": !isLogin })} />
        <span>{isLogin ? "管理后台" : "登录"}</span>
      </a>
    </div>
  )
}
export default Header
