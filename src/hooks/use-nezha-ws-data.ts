import { useMemo } from "react"

import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { NezhaWebsocketResponse } from "@/types/nezha-api"

export function parseNezhaWsMessage(data: string | undefined | null): NezhaWebsocketResponse | null {
  if (!data) return null
  try {
    return JSON.parse(data) as NezhaWebsocketResponse
  } catch (error) {
    console.error("Failed to parse Nezha websocket message:", error)
    return null
  }
}

export function useNezhaWsData() {
  const context = useWebSocketContext()
  const data = useMemo(() => parseNezhaWsMessage(context.lastMessage?.data), [context.lastMessage?.data])

  return {
    ...context,
    data,
  }
}
