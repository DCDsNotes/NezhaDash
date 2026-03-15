import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import ReactDOM from "react-dom/client"
import { Toaster } from "sonner"

import App from "./App"
import { MotionProvider } from "./components/motion/motion-provider"
import { SortProvider } from "./context/sort-provider"
import { StatusProvider } from "./context/status-provider"
import { TooltipProvider } from "./context/tooltip-provider"
import { WebSocketProvider } from "./context/websocket-provider"
import "./i18n"
import "flag-icons/css/flag-icons.min.css"
import "font-logos/assets/font-logos.css"
import "remixicon/fonts/remixicon.css"
import "./index.css"

const queryClient = new QueryClient()

const rootEl = document.getElementById("root")!
ReactDOM.createRoot(rootEl).render(
  <MotionProvider>
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider url="/api/v1/ws/server">
        <StatusProvider>
          <SortProvider>
            <TooltipProvider>
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
              <ReactQueryDevtools />
            </TooltipProvider>
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
