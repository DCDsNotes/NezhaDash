import { Skeleton } from "@/components/ui/skeleton"
import { Loader, LoadingSpinner } from "@/components/loading/Loader"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { fetchLoginUser, fetchSetting } from "@/lib/nezha-api"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, m } from "framer-motion"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"

function formatCompactBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0B"
  const units = ["B", "K", "M", "G", "T", "P", "E", "Z", "Y"]
  let v = bytes
  let u = 0
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  const num = v >= 10 ? v.toFixed(0) : v.toFixed(1)
  return `${num.replace(/\\.0$/, "")}${units[u]}`
}

export default function Header() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: settingData, isLoading } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  const { lastMessage, connected } = useWebSocketContext()
  const ws = lastMessage ? (JSON.parse(lastMessage.data) as { servers?: any[] }) : null

  const siteName = settingData?.data?.config?.site_name

  // @ts-expect-error CustomLogo is a global variable
  const customLogo = window.CustomLogo || "/apple-touch-icon.png"

  useEffect(() => {
    const link = document.querySelector("link[rel*='icon']") || document.createElement("link")
    // @ts-expect-error set link.type
    link.type = "image/x-icon"
    // @ts-expect-error set link.rel
    link.rel = "shortcut icon"
    // @ts-expect-error set link.href
    link.href = customLogo
    document.getElementsByTagName("head")[0].appendChild(link)
  }, [customLogo])

  useEffect(() => {
    document.title = siteName || "哪吒探针"
  }, [siteName])

  const serverCount = ws?.servers?.length ?? 0
  const totalTransferIn = ws?.servers?.reduce((acc, s: any) => acc + (s?.state?.net_in_transfer || 0), 0) || 0
  const totalTransferOut = ws?.servers?.reduce((acc, s: any) => acc + (s?.state?.net_out_transfer || 0), 0) || 0
  const totalSpeedIn = ws?.servers?.reduce((acc, s: any) => acc + (s?.state?.net_in_speed || 0), 0) || 0
  const totalSpeedOut = ws?.servers?.reduce((acc, s: any) => acc + (s?.state?.net_out_speed || 0), 0) || 0

  return (
    <div className="nazhua-layout-header">
      <div
        className="nazhua-header-container"
        style={{
          width: location.pathname.startsWith("/server/") ? "var(--detail-container-width)" : "var(--list-container-width)",
        }}
      >
        <div
          className="nazhua-site-name"
          onClick={() => {
            sessionStorage.removeItem("selectedGroup")
            navigate("/")
          }}
        >
          {isLoading ? <Skeleton className="h-7 w-24 rounded bg-white/10 animate-none" /> : siteName || "哪吒探针"}
        </div>

        <div className="nazhua-header-right">
          <div className="nazhua-header-stat">
            <div className="nazhua-stat-line">
              <span className="nazhua-stat-label">流量</span>
              <span className="nazhua-stat-item">↑ {formatCompactBytes(totalTransferOut)}</span>
              <span className="nazhua-stat-item">↓ {formatCompactBytes(totalTransferIn)}</span>
            </div>
            <div className="nazhua-stat-line">
              <span className="nazhua-stat-label">网速</span>
              <span className="nazhua-stat-item">↑ {formatCompactBytes(totalSpeedOut)}/s</span>
              <span className="nazhua-stat-item">↓ {formatCompactBytes(totalSpeedIn)}/s</span>
            </div>
          </div>
          <div className="nazhua-header-count">共 {serverCount} 台服务器</div>
          <DashboardLink />
          <div className="nazhua-header-conn">
            <span
              className={cn("nazhua-conn-dot", {
                "nazhua-conn-dot--offline": !connected,
              })}
            />
            <span className="nazhua-conn-text">{connected ? t("online") : t("offline")}</span>
            {!connected ? <Loader visible={true} /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RefreshToast() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { needReconnect } = useWebSocketContext()

  if (!needReconnect) return null

  sessionStorage.removeItem("needRefresh")
  setTimeout(() => {
    navigate(0)
  }, 1000)

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, filter: "blur(10px)", scale: 0.8 }}
        animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
        exit={{ opacity: 0, filter: "blur(10px)", scale: 0.8 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="fixed left-1/2 -translate-x-1/2 top-8 z-[999] flex items-center justify-between gap-4 rounded-[50px] border border-white/10 bg-black/70 px-2 py-1.5 text-white backdrop-blur-xl"
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
  const { t } = useTranslation()
  const { setNeedReconnect } = useWebSocketContext()
  const previousLoginState = useRef<boolean | null>(null)
  const { data: userData, isFetched, isLoadingError, isError, refetch } = useQuery({
    queryKey: ["login-user"],
    queryFn: () => fetchLoginUser(),
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    refetchInterval: 1000 * 30,
    retry: 0,
  })

  const isLogin = isError ? false : userData ? !!userData?.data?.id && !!document.cookie : false

  if (isLoadingError) previousLoginState.current = isLogin

  useEffect(() => {
    refetch()
  }, [refetch])

  useEffect(() => {
    if (isFetched || isError) {
      if (previousLoginState.current !== null && previousLoginState.current !== isLogin) setNeedReconnect(true)
      previousLoginState.current = isLogin
    }
  }, [isFetched, isError, isLogin, setNeedReconnect])

  return (
    <a href={"/dashboard"} rel="noopener noreferrer" className="nazhua-dashboard-link">
      {isLogin ? t("dashboard") : t("login")}
    </a>
  )
}
