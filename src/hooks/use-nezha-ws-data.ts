import { useWebSocketContext } from "@/hooks/use-websocket-context"

export { parseNezhaWsMessage } from "@/lib/nezha-websocket"

export function useNezhaWsData() {
  return useWebSocketContext()
}
