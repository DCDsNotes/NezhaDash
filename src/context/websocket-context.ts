import { type NezhaWebsocketResponse } from "@/types/nezha-api"
import { createContext } from "react"

export interface WebSocketContextType {
  data: NezhaWebsocketResponse | null
  connected: boolean
  reconnect: () => void
  needReconnect: boolean
  setNeedReconnect: (needReconnect: boolean) => void
}

export const WebSocketContext = createContext<WebSocketContextType>({
  data: null,
  connected: false,
  reconnect: () => {},
  needReconnect: false,
  setNeedReconnect: () => {},
})
