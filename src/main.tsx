import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import ReactDOM from "react-dom/client"
import { Toaster } from "sonner"

import App from "./App"
import { MotionProvider } from "./components/motion/motion-provider"
import { CommandProvider } from "./context/command-provider"
import { SortProvider } from "./context/sort-provider"
import { StatusProvider } from "./context/status-provider"
import { TooltipProvider } from "./context/tooltip-provider"
import { WebSocketProvider } from "./context/websocket-provider"
import "./i18n"
import "./index.css"

const queryClient = new QueryClient()

// Dark-only: force html.dark and a stable theme-color.
document.documentElement.classList.add("dark")
document.documentElement.classList.remove("light")
document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#252748")

ReactDOM.createRoot(document.getElementById("root")!).render(
  <MotionProvider>
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider url="/api/v1/ws/server">
        <CommandProvider>
          <StatusProvider>
            <SortProvider>
              <TooltipProvider>
                <App />
                <Toaster
                  duration={1000}
                  toastOptions={{
                    classNames: {
                      default: "w-fit rounded-full px-2.5 py-1.5 bg-black/70 border border-white/10 text-white backdrop-blur-xl shadow-none",
                    },
                  }}
                  position="top-center"
                  className={"flex items-center justify-center"}
                />
                <ReactQueryDevtools />
              </TooltipProvider>
            </SortProvider>
          </StatusProvider>
        </CommandProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  </MotionProvider>,
)
