import { useQuery } from "@tanstack/react-query"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom"

import { DashCommand } from "./components/DashCommand"
import ErrorBoundary from "./components/ErrorBoundary"
import Footer from "./components/Footer"
import Header, { RefreshToast } from "./components/Header"
import { useBackground } from "./hooks/use-background"
import { useTheme } from "./hooks/use-theme"
import { InjectContext } from "./lib/inject"
import { fetchSetting } from "./lib/nezha-api"
import { cn } from "./lib/utils"
import ErrorPage from "./pages/ErrorPage"
import NotFound from "./pages/NotFound"
import Server from "./pages/Server"
import ServerDetail from "./pages/ServerDetail"

// Route checker component
const RouteChecker: React.FC = () => {
  return <MainApp />
}

const MainApp: React.FC = () => {
  const location = useLocation()
  const { data: settingData, error } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
  const { i18n } = useTranslation()
  const { setTheme } = useTheme()
  const [isCustomCodeInjected, setIsCustomCodeInjected] = useState(false)
  const { backgroundImage: customBackgroundImage } = useBackground()

  useEffect(() => {
    if (settingData?.data?.config?.custom_code) {
      InjectContext(settingData?.data?.config?.custom_code)
      setIsCustomCodeInjected(true)
    }
  }, [settingData?.data?.config?.custom_code])

  // 检测是否强制指定了主题颜色
  const forceTheme =
    // @ts-expect-error ForceTheme is a global variable
    (window.ForceTheme as string) !== "" ? window.ForceTheme : undefined

  useEffect(() => {
    if (forceTheme === "dark" || forceTheme === "light") {
      setTheme(forceTheme)
    }
  }, [forceTheme])

  if (error) {
    return <ErrorPage code={500} message={error.message} />
  }

  if (!settingData) {
    return null
  }

  if (settingData?.data?.config?.custom_code && !isCustomCodeInjected) {
    return null
  }

  if (settingData?.data?.config?.language && !localStorage.getItem("language")) {
    i18n.changeLanguage(settingData?.data?.config?.language)
  }

  const customMobileBackgroundImage = window.CustomMobileBackgroundImage !== "" ? window.CustomMobileBackgroundImage : undefined

  const isDetailPage = location.pathname.startsWith("/server/")
  const layoutContainerWidth = isDetailPage ? "var(--detail-container-width)" : "var(--list-container-width)"

  return (
    <ErrorBoundary>
      {/* 固定定位的背景层 */}
      {!customBackgroundImage && <div className="fixed inset-0 z-0 nazhua-layout-bg dark:brightness-90" />}
      {customBackgroundImage && (
        <div
          className={cn("fixed inset-0 z-0 bg-cover min-h-lvh bg-no-repeat bg-center dark:brightness-75", {
            "hidden sm:block": customMobileBackgroundImage,
          })}
          style={{ backgroundImage: `url(${customBackgroundImage})` }}
        />
      )}
      {customMobileBackgroundImage && (
        <div
          className={cn("fixed inset-0 z-0 bg-cover min-h-lvh bg-no-repeat bg-center sm:hidden dark:brightness-75")}
          style={{ backgroundImage: `url(${customMobileBackgroundImage})` }}
        />
      )}
      <div
        style={{ ["--layout-container-width" as any]: layoutContainerWidth } as React.CSSProperties}
        className="relative z-10 flex min-h-screen w-full flex-col bg-[var(--layout-main-bg-color)]"
      >
        <RefreshToast />
        <Header />
        <DashCommand />
        <main className="flex z-20 flex-1 flex-col px-4 pb-4 pt-6 md:px-6 md:pb-6 md:pt-8">
          <Routes>
            <Route path="/" element={<Server />} />
            <Route path="/server/:id" element={<ServerDetail />} />
            <Route path="/error" element={<ErrorPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ErrorBoundary>
  )
}

// Main App wrapper with router
const App: React.FC = () => {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <RouteChecker />
    </Router>
  )
}

export default App
