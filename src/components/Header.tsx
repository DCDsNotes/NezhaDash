import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { fetchLoginUser, fetchSetting } from "@/lib/nezha-api"
import { calcBinary } from "@/lib/server-spec"
import { cn, formatNezhaInfo } from "@/lib/utils"
import { NezhaWebsocketResponse } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, m } from "framer-motion"
import { type CSSProperties, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { LoadingSpinner } from "./loading/Loader"

function Header() {
  const navigate = useNavigate()

  const { data: settingData } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  const { lastMessage, connected } = useWebSocketContext()

  const siteName = settingData?.data?.config?.site_name

  const nezhaWsData = connected && lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null

  const serverCount = useMemo(() => {
    if (!connected || !nezhaWsData || !Array.isArray(nezhaWsData.servers)) {
      return null
    }
    const total = nezhaWsData.servers.length
    const online = nezhaWsData.servers.reduce((acc, s) => (formatNezhaInfo(nezhaWsData.now, s).online ? acc + 1 : acc), 0)
    const offline = Math.max(total - online, 0)
    return { total, online, offline }
  }, [connected, nezhaWsData?.now, nezhaWsData?.servers])

  const serverStat = useMemo(() => {
    if (!connected || !nezhaWsData || !Array.isArray(nezhaWsData.servers)) return null
    let transferIn = 0
    let transferOut = 0
    let speedIn = 0
    let speedOut = 0
    nezhaWsData.servers.forEach((s) => {
      const online = formatNezhaInfo(nezhaWsData.now, s).online
      if (!online) return
      transferIn += Number(s.state?.net_in_transfer || 0)
      transferOut += Number(s.state?.net_out_transfer || 0)
      speedIn += Number(s.state?.net_in_speed || 0)
      speedOut += Number(s.state?.net_out_speed || 0)
    })

    function formatBinary(bytes: number, decimals = 1) {
      const stats = calcBinary(bytes)
      if (stats.t > 1) return { value: Number(stats.t.toFixed(decimals)), unit: "T" }
      if (stats.g > 1) return { value: Number(stats.g.toFixed(decimals)), unit: "G" }
      if (stats.m > 1) return { value: Number(stats.m.toFixed(decimals)), unit: "M" }
      return { value: Math.max(1, Number(stats.k.toFixed(decimals))), unit: "K" }
    }

    return {
      transfer: {
        inData: formatBinary(transferIn),
        outData: formatBinary(transferOut),
      },
      netSpeed: {
        inData: formatBinary(speedIn),
        outData: formatBinary(speedOut),
      },
    }
  }, [connected, nezhaWsData?.now, nezhaWsData?.servers])

  useEffect(() => {
    document.title = siteName || "哪吒监控"
  }, [siteName])

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
                <span className="icon ri-checkbox-circle-line" />
                <span className="value">{serverCount.online}</span>
              </span>
              <span className="server-count server-count--offline" title="离线">
                <span className="icon ri-close-circle-line" />
                <span className="value">{serverCount.offline}</span>
              </span>
            </div>
          ) : null}

          {serverStat ? (
            <div className="server-stat-group">
              <div className="server-stat server-stat--transfer">
                <span className="server-stat-label">
                  <span className="text">流量</span>
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

          <DashboardLink />
        </div>
      </div>
    </div>
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
        className="fixed left-1/2 -translate-x-1/2 top-8 z-[999] flex items-center justify-between gap-4 rounded-[50px] border-[1px] border-solid bg-white px-2 py-1.5 shadow-xl shadow-black/5 dark:border-stone-700 dark:bg-stone-800 dark:shadow-none"
      >
        <section className="flex items-center gap-1.5">
          <LoadingSpinner />
          <p className="text-[12.5px] font-medium">{t("refreshing")}...</p>
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
