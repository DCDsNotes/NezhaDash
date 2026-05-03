import { useQuery } from "@tanstack/react-query"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Route, BrowserRouter as Router, Routes } from "react-router-dom"

import ErrorBoundary from "./components/ErrorBoundary"
import Footer from "./components/Footer"
import Header, { RefreshToast } from "./components/Header"
import SearchBox from "./components/SearchBox"
import { useBackground } from "./hooks/use-background"
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
  const { data: settingData, error } = useQuery({
    queryKey: ["setting"],
    queryFn: () => fetchSetting(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
  const { i18n } = useTranslation()
  const [isCustomCodeInjected, setIsCustomCodeInjected] = useState(false)
  const { backgroundImage: customBackgroundImage } = useBackground()

  useEffect(() => {
    if (settingData?.data?.config?.custom_code) {
      InjectContext(settingData?.data?.config?.custom_code)
      setIsCustomCodeInjected(true)
    }
  }, [settingData?.data?.config?.custom_code])

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

  return (
    <ErrorBoundary>
      <div className="nazha-layout">
        <div
          className={cn("nazha-layout-bg", {
            "hidden sm:block": customMobileBackgroundImage,
          })}
          style={customBackgroundImage ? { backgroundImage: `url(${customBackgroundImage})`, backgroundSize: "cover" } : undefined}
        />
        {customMobileBackgroundImage && (
          <div
            className="nazha-layout-bg sm:hidden"
            style={{ backgroundImage: `url(${customMobileBackgroundImage})`, backgroundSize: "cover" }}
          />
        )}
        <div className="nazha-layout-main">
          <main className="flex min-h-screen w-full flex-1 flex-col gap-0 p-0">
            <RefreshToast />
            <Header />
            <Routes>
              <Route path="/" element={<Server />} />
              <Route path="/server/:serverKey" element={<ServerDetail />} />
              <Route path="/error" element={<ErrorPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Footer />
            <SearchBox />
          </main>
        </div>
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
