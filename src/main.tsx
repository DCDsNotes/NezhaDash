import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import ReactDOM from "react-dom/client"
import { Toaster } from "sonner"

import App from "./App"
import { ThemeColorManager } from "./components/ThemeColorManager"
import { ThemeProvider } from "./components/ThemeProvider"
import { MotionProvider } from "./components/motion/motion-provider"
import { CommandProvider } from "./context/command-provider"
import { SortProvider } from "./context/sort-provider"
import { StatusProvider } from "./context/status-provider"
import { TooltipProvider } from "./context/tooltip-provider"
import { WebSocketProvider } from "./context/websocket-provider"
import "./i18n"
import "./index.css"

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <MotionProvider>
    <ThemeProvider storageKey="vite-ui-theme">
      <ThemeColorManager />
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
                        default:
                          "w-fit rounded-full px-2.5 py-1.5 bg-white/80 text-black/80 border border-black/10 backdrop-blur-xl shadow-none dark:bg-black/30 dark:text-white/90 dark:border-white/10",
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
    </ThemeProvider>
  </MotionProvider>,
)
