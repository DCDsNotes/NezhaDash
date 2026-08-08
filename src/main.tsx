import "font-logos/assets/font-logos.css"
import ReactDOM from "react-dom/client"
import { RouterProvider } from "react-router-dom"

import "./index.css"
import { getApplicationBaseUrl } from "./lib/app-base"
import { AppProviders } from "./providers"
import { router } from "./router"
import "./styles/home.css"
import "./styles/layout.css"
import "./styles/loading.css"
import "./styles/map.css"
import "./styles/probe.css"
import "./styles/remixicon.css"
import "./styles/search.css"
import "./styles/tokens.css"
import "./styles/workspace.css"

const rootEl = document.getElementById("root")!
ReactDOM.createRoot(rootEl).render(
  <AppProviders>
    <RouterProvider router={router} />
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
    const serviceWorkerUrl = new URL("sw.js", getApplicationBaseUrl())
    navigator.serviceWorker.register(serviceWorkerUrl, { updateViaCache: "none" }).catch(() => {
      // ignore
    })
  })
}
