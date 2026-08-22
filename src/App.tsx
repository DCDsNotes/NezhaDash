import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import ProbeWorkspace from "./components/ProbeWorkspace"
import RefreshToast from "./components/RefreshToast"
import { useBackground } from "./hooks/use-background"
import { hasStoredLanguage, setAppLanguage } from "./i18n"
import { clearInjectedContext, injectContext } from "./lib/inject"
import { settingQueryOptions } from "./lib/query-options"
import { cn } from "./lib/utils"

export default function App() {
  const { data: settingData, error } = useQuery(settingQueryOptions())
  const [injectedCustomCode, setInjectedCustomCode] = useState<string | null>(null)
  const customCode = settingData?.data?.config?.custom_code || ""
  const configuredLanguage = settingData?.data?.config?.language
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

  const customMobileBackgroundImage = window.CustomMobileBackgroundImage || undefined
  const contentReady = Boolean(settingData) && (!customCode || injectedCustomCode === customCode)

  return (
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
        <ProbeWorkspace contentReady={contentReady} contentError={Boolean(error)} configuredSiteName={settingData?.data?.config?.site_name} />
      </div>
    </div>
  )
}
