import { LoadingSpinner } from "@/components/loading/loading-spinner"
import { useWebSocketControls } from "@/hooks/use-websocket-context"
import { useAppTranslation } from "@/i18n"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function RefreshToast() {
  const t = useAppTranslation()
  const navigate = useNavigate()
  const { needReconnect } = useWebSocketControls()

  useEffect(() => {
    if (!needReconnect) return

    sessionStorage.removeItem("needRefresh")
    const timeoutId = window.setTimeout(() => navigate(0), 1000)
    return () => window.clearTimeout(timeoutId)
  }, [navigate, needReconnect])

  if (!needReconnect) return null

  return (
    <div className="dashboard-refresh-toast">
      <LoadingSpinner />
      <span>{t("refreshing")}...</span>
    </div>
  )
}
