import { nezhaWebSocketUrl } from "@/lib/nezha-endpoints"
import { parseNezhaWsMessage } from "@/lib/nezha-websocket"
import { type NezhaWebsocketResponse } from "@/types/nezha-api"
import { type ReactNode, useEffect, useMemo, useState } from "react"

import { WebSocketControlsContext, WebSocketDataContext } from "./websocket-context"

const MESSAGE_IDLE_TIMEOUT = 30_000
const RECONNECT_BASE_DELAY = 3_000
const RECONNECT_MAX_DELAY = 30_000

export function WebSocketProvider({ path, children }: { path: string; children: ReactNode }) {
  const [data, setData] = useState<NezhaWebsocketResponse | null>(null)
  const [needReconnect, setNeedReconnect] = useState(false)

  useEffect(() => {
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let staleTimer: ReturnType<typeof setTimeout> | null = null
    let renderFrame = 0
    let reconnectAttempts = 0
    let disposed = false
    let pendingData: NezhaWebsocketResponse | null = null
    let lastMessageAt = 0

    const canConnect = () => !disposed && navigator.onLine !== false

    const clearReconnectTimer = () => {
      if (!reconnectTimer) return
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    const clearStaleTimer = () => {
      if (!staleTimer) return
      clearTimeout(staleTimer)
      staleTimer = null
    }

    const closeSocket = () => {
      clearStaleTimer()
      const current = socket
      socket = null
      if (current) {
        current.onopen = null
        current.onclose = null
        current.onmessage = null
        current.onerror = null
        if (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING) current.close()
      }
    }

    const queueRender = (nextData: NezhaWebsocketResponse) => {
      pendingData = nextData
      if (renderFrame) return
      renderFrame = window.requestAnimationFrame(() => {
        renderFrame = 0
        if (!pendingData || disposed) return
        setData(pendingData)
        pendingData = null
      })
    }

    let connect = () => {}

    const scheduleReconnect = () => {
      if (!canConnect() || reconnectTimer) return
      const baseDelay = Math.min(RECONNECT_BASE_DELAY * 2 ** reconnectAttempts, RECONNECT_MAX_DELAY)
      const delay = Math.round(baseDelay * (0.85 + Math.random() * 0.3))
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        reconnectAttempts += 1
        connect()
      }, delay)
    }

    const armStaleTimer = () => {
      clearStaleTimer()
      staleTimer = setTimeout(() => {
        staleTimer = null
        if (!socket || socket.readyState !== WebSocket.OPEN) return
        closeSocket()
        scheduleReconnect()
      }, MESSAGE_IDLE_TIMEOUT)
    }

    connect = () => {
      if (!canConnect()) return
      if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return

      clearReconnectTimer()
      closeSocket()

      try {
        const nextSocket = new WebSocket(nezhaWebSocketUrl(path))
        socket = nextSocket

        nextSocket.onopen = () => {
          if (socket !== nextSocket) return
          reconnectAttempts = 0
          lastMessageAt = Date.now()
          armStaleTimer()
        }

        nextSocket.onmessage = (event) => {
          if (socket !== nextSocket) return
          lastMessageAt = Date.now()
          armStaleTimer()
          const parsed = parseNezhaWsMessage(typeof event.data === "string" ? event.data : String(event.data || ""))
          if (parsed) queueRender(parsed)
        }

        nextSocket.onclose = () => {
          if (socket !== nextSocket) return
          socket = null
          clearStaleTimer()
          scheduleReconnect()
        }

        nextSocket.onerror = () => {
          if (socket === nextSocket) nextSocket.close()
        }
      } catch {
        socket = null
        scheduleReconnect()
      }
    }

    const pause = () => {
      clearReconnectTimer()
      closeSocket()
    }

    const resume = () => {
      if (!canConnect()) return
      reconnectAttempts = 0
      if (socket?.readyState === WebSocket.OPEN && lastMessageAt && Date.now() - lastMessageAt >= MESSAGE_IDLE_TIMEOUT) closeSocket()
      connect()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") resume()
    }
    const handlePageShow = () => resume()
    const handleOffline = () => pause()
    const handleOnline = () => resume()

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pageshow", handlePageShow)
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    connect()

    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pageshow", handlePageShow)
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      clearReconnectTimer()
      closeSocket()
      if (renderFrame) window.cancelAnimationFrame(renderFrame)
    }
  }, [path])

  const dataValue = useMemo(() => ({ data }), [data])
  const controlsValue = useMemo(() => ({ needReconnect, setNeedReconnect }), [needReconnect])

  return (
    <WebSocketDataContext.Provider value={dataValue}>
      <WebSocketControlsContext.Provider value={controlsValue}>{children}</WebSocketControlsContext.Provider>
    </WebSocketDataContext.Provider>
  )
}
