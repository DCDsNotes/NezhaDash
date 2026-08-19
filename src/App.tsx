import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import ErrorBoundary from "./components/ErrorBoundary"
import ProbeWorkspace from "./components/ProbeWorkspace"
import RefreshToast from "./components/RefreshToast"
import { useBackground } from "./hooks/use-background"
import { hasStoredLanguage, setAppLanguage } from "./i18n"
import { clearInjectedContext, injectContext } from "./lib/inject"
import { settingQueryOptions } from "./lib/query-options"
import { cn } from "./lib/utils"
import ErrorPage from "./pages/ErrorPage"

export default function App() {
  const { data: settingData, error } = useQuery(settingQueryOptions())
  const [injectedCustomCode, setInjectedCustomCode] = useState<string | null>(null)
  const config = settingData?.data?.config
  const customCode = config?.custom_code || ""
  const configuredLanguage = config?.language
  const { backgroundImage: customBackgroundImage } = useBackground(injectedCustomCode)

  useEffect(() => {
    if (!customCode) {
      clearInjectedContext()
      setInjectedCustomCode(null)
      return
    }

    let active = true
    setInjectedCustomCode(null)
    void injectContext(customCode)
      .catch(() => undefined)
      .then(() => {
        if (active) setInjectedCustomCode(customCode)
      })

    return () => {
      active = false
    }
  }, [customCode])

  useEffect(() => {
    if (configuredLanguage && !hasStoredLanguage()) {
      setAppLanguage(configuredLanguage)
    }
  }, [configuredLanguage])

  if (error) {
    return <ErrorPage code={500} standalone />
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
          <ProbeWorkspace configuredSiteName={config?.site_name} />
        </div>
      </div>
    </ErrorBoundary>
  )
}
