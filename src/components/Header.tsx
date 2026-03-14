import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { fetchLoginUser, fetchSetting } from "@/lib/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, m } from "framer-motion"
import { CheckCircle2, XCircle } from "lucide-react"
import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { LanguageSwitcher } from "./LanguageSwitcher"
import { SearchButton } from "./SearchButton"
import { LoadingSpinner } from "./loading/Loader"

function Header() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: settingData } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  const { lastMessage, connected } = useWebSocketContext()

  const siteName = settingData?.data?.config?.site_name

  const wsData = connected && lastMessage ? (JSON.parse(lastMessage.data) as { online?: number; servers?: unknown[] }) : null
  const onlineCount = connected ? wsData?.online ?? 0 : "..."
  const offlineCount = connected
    ? Math.max((Array.isArray(wsData?.servers) ? wsData?.servers.length : 0) - (typeof wsData?.online === "number" ? wsData.online : 0), 0)
    : "..."

  useEffect(() => {
    document.title = siteName || "哪吒监控"
  }, [siteName])

  return (
    <div className="nazha-header">
      <div className="nazha-container flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-[10px]">
        <span
          className="cursor-pointer font-bold text-[24px] max-[720px]:text-[18px] text-white [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]"
          onClick={() => {
            sessionStorage.removeItem("selectedGroup")
            navigate("/")
          }}
        >
          {siteName || "哪吒监控"}
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[#ddd]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-bold" title={t("online")} style={{ color: "var(--server-online-color)" }}>
              <CheckCircle2 className="h-[18px] w-[18px]" />
              <span>{onlineCount}</span>
            </span>
            <span className="flex items-center gap-1 font-bold" title={t("offline")} style={{ color: "var(--server-offline-color)" }}>
              <XCircle className="h-[18px] w-[18px]" />
              <span>{offlineCount}</span>
            </span>
          </div>
          <SearchButton />
          <LanguageSwitcher />
          <div className="hidden sm:flex items-center gap-3">
            <Links />
            <DashboardLink />
          </div>
        </div>
      </div>
    </div>
  )
}

type links = {
  link: string
  name: string
}

function Links() {
  // @ts-expect-error CustomLinks is a global variable
  const customLinks = window.CustomLinks as string

  const links: links[] | null = customLinks ? JSON.parse(customLinks) : null

  if (!links) return null

  return (
    <div className="flex items-center gap-2 w-fit">
      {links.map((link, index) => {
        return (
          <a
            key={index}
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
          >
            {link.name}
          </a>
        )
      })}
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
  const { t } = useTranslation()
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
    <div className="flex items-center gap-2">
      <a
        href={"/dashboard"}
        rel="noopener noreferrer"
        className="flex items-center text-nowrap gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
      >
        {!isLogin && t("login")}
        {isLogin && t("dashboard")}
      </a>
    </div>
  )
}
export default Header
