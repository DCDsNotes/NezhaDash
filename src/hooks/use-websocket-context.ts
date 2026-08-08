import { WebSocketControlsContext, WebSocketDataContext } from "@/context/websocket-context"
import { useContext } from "react"

export function useWebSocketData() {
  const context = useContext(WebSocketDataContext)
  if (!context) throw new Error("useWebSocketData must be used within a WebSocketProvider")
  return context
}

export function useWebSocketControls() {
  const context = useContext(WebSocketControlsContext)
  if (!context) throw new Error("useWebSocketControls must be used within a WebSocketProvider")
  return context
}
