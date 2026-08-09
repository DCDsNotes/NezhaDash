import { WebSocketProvider } from "@/context/websocket-provider"
import { queryClient } from "@/lib/query-client"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import NetworkStatusNotice from "./components/NetworkStatusNotice"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkStatusNotice />
      <WebSocketProvider path="/ws/server">{children}</WebSocketProvider>
    </QueryClientProvider>
  )
}
