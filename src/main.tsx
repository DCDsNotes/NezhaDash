import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ReactDOM from "react-dom/client"
import { Toaster } from "sonner"

import App from "./App"
import { MotionProvider } from "./components/motion/motion-provider"
import { SortProvider } from "./context/sort-provider"
import { StatusProvider } from "./context/status-provider"
import { WebSocketProvider } from "./context/websocket-provider"
import "./i18n"
import "flag-icons/css/flag-icons.min.css"
import "font-logos/assets/font-logos.css"
import "remixicon/fonts/remixicon.css"
import "./index.css"
import "./styles/tokens.css"
import "./styles/loading.css"
import "./styles/layout.css"
import "./styles/search.css"
import "./styles/shared.css"
import "./styles/map.css"
import "./styles/home.css"
import "./styles/detail.css"
import "./styles/monitor.css"

const queryClient = new QueryClient()

const rootEl = document.getElementById("root")!
ReactDOM.createRoot(rootEl).render(
  <MotionProvider>
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider path="/ws/server">
        <StatusProvider>
          <SortProvider>
            <App />
            <Toaster
              duration={1000}
              toastOptions={{
                classNames: {
                  default: "w-fit rounded-full px-2.5 py-1.5 bg-neutral-100 border border-neutral-200 backdrop-blur-xl shadow-none",
                },
              }}
              position="top-center"
              className={"flex items-center justify-center"}
            />
          </SortProvider>
        </StatusProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  </MotionProvider>,
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
