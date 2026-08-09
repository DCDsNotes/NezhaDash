import { useAppTranslation } from "@/i18n"
import { useSyncExternalStore } from "react"

function subscribeToNetworkStatus(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange)
  window.addEventListener("offline", onStoreChange)

  return () => {
    window.removeEventListener("online", onStoreChange)
    window.removeEventListener("offline", onStoreChange)
  }
}

function getNetworkStatus() {
  return navigator.onLine
}

export default function NetworkStatusNotice() {
  const online = useSyncExternalStore(subscribeToNetworkStatus, getNetworkStatus, () => true)
  const t = useAppTranslation()

  if (online) return null

  return (
    <div className="network-status-notice" role="status" aria-live="polite" aria-atomic="true">
      <span className="network-status-notice__icon" aria-hidden="true">
        <i className="ri-wifi-off-line" />
      </span>
      <span className="network-status-notice__content">
        <strong>{t("network.offlineTitle")}</strong>
        <span>{t("network.offlineDescription")}</span>
      </span>
    </div>
  )
}
