import { LoadingSpinner } from "@/components/loading/loading-spinner"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

export default function RefreshToast() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { needReconnect } = useWebSocketContext()

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
