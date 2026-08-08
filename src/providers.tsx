import { SortProvider } from "@/context/sort-provider"
import { StatusProvider } from "@/context/status-provider"
import { WebSocketProvider } from "@/context/websocket-provider"
import { queryClient } from "@/lib/query-client"
import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider path="/ws/server">
        <StatusProvider>
          <SortProvider>{children}</SortProvider>
        </StatusProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  )
}
