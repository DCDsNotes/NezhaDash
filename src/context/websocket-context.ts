import { type NezhaWebsocketResponse } from "@/types/nezha-api"
import { type Dispatch, type SetStateAction, createContext } from "react"

export type WebSocketDataContextValue = {
  data: NezhaWebsocketResponse | null
}

export type WebSocketControlsContextValue = {
  needReconnect: boolean
  setNeedReconnect: Dispatch<SetStateAction<boolean>>
}

export const WebSocketDataContext = createContext<WebSocketDataContextValue | undefined>(undefined)
export const WebSocketControlsContext = createContext<WebSocketControlsContextValue | undefined>(undefined)
