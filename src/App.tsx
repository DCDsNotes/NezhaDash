import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import ErrorBoundary from "./components/ErrorBoundary"
import ProbeWorkspace from "./components/ProbeWorkspace"
import RefreshToast from "./components/RefreshToast"
import { useBackground } from "./hooks/use-background"
import { InjectContext } from "./lib/inject"
import { settingQueryOptions } from "./lib/query-options"
import { cn } from "./lib/utils"
import ErrorPage from "./pages/ErrorPage"

export default function App() {
  const { data: settingData, error } = useQuery(settingQueryOptions())
  const { i18n } = useTranslation()
  const [injectedCustomCode, setInjectedCustomCode] = useState<string | null>(null)
  const customCode = settingData?.data?.config?.custom_code || ""
  const configuredLanguage = settingData?.data?.config?.language
  const { backgroundImage: customBackgroundImage } = useBackground(injectedCustomCode)

  useEffect(() => {
    if (!customCode) {
      setInjectedCustomCode(null)
      return
    }

    let active = true
    setInjectedCustomCode(null)
    void InjectContext(customCode).then(() => {
      if (active) setInjectedCustomCode(customCode)
    })

    return () => {
      active = false
    }
  }, [customCode])

  useEffect(() => {
    if (configuredLanguage && !localStorage.getItem("language")) {
      void i18n.changeLanguage(configuredLanguage)
    }
  }, [configuredLanguage, i18n])

  if (error) {
    return <ErrorPage code={500} message={error.message} />
  }

  if (!settingData) {
    return null
  }

  if (customCode && injectedCustomCode !== customCode) {
    return null
  }

  const customMobileBackgroundImage = window.CustomMobileBackgroundImage || undefined

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
          <div className="nazha-layout-bg sm:hidden" style={{ backgroundImage: `url(${customMobileBackgroundImage})`, backgroundSize: "cover" }} />
        )}
        <div className="nazha-layout-main">
          <RefreshToast />
          <ProbeWorkspace />
        </div>
      </div>
    </ErrorBoundary>
  )
}
