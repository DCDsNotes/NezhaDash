import { useWebSocketData } from "@/hooks/use-websocket-context"

export function useNezhaWsData() {
  return useWebSocketData()
}
