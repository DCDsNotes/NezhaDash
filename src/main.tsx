import "flag-icons/css/flag-icons.min.css"
import "font-logos/assets/font-logos.css"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import "remixicon/fonts/remixicon.css"
import { Toaster } from "sonner"

import "./i18n"
import "./index.css"
import { AppProviders } from "./providers"
import { router } from "./router"
import "./styles/detail.css"
import "./styles/home.css"
import "./styles/layout.css"
import "./styles/loading.css"
import "./styles/map.css"
import "./styles/monitor.css"
import "./styles/search.css"
import "./styles/shared.css"
import "./styles/tokens.css"
import "./styles/workspace.css"
import "./styles/probe.css"

const rootEl = document.getElementById("root")!
ReactDOM.createRoot(rootEl).render(
  <AppProviders>
    <RouterProvider router={router} />
    <Toaster
      theme="light"
      duration={1000}
      toastOptions={{
        classNames: {
          default: "w-fit rounded-md border border-border bg-white px-2.5 py-1.5 text-foreground shadow-lg",
        },
      }}
      position="top-center"
      className="flex items-center justify-center"
    />
  </AppProviders>,
)

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const loadingEl = document.getElementById("app-loading")
    if (loadingEl) {
      loadingEl.classList.add("hidden")
      window.setTimeout(() => loadingEl.remove(), 250)
    }
  })
})

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        // ignore
      })
  })
}
