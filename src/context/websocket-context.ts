import { createContext } from "react"

export interface WebSocketContextType {
  lastMessage: { data: string } | null
  connected: boolean
  reconnect: () => void
  needReconnect: boolean
  setNeedReconnect: (needReconnect: boolean) => void
}

export const WebSocketContext = createContext<WebSocketContextType>({
  lastMessage: null,
  connected: false,
  reconnect: () => {},
  needReconnect: false,
  setNeedReconnect: () => {},
})
