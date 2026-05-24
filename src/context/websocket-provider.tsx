import React, { useEffect, useRef, useState } from "react"

import { nezhaWebSocketUrl } from "@/lib/nezha-endpoints"

import { WebSocketContext, WebSocketContextType } from "./websocket-context"

interface WebSocketProviderProps {
  path: string
  children: React.ReactNode
}

const MESSAGE_IDLE_TIMEOUT = 30_000
const STALE_CHECK_INTERVAL = 5_000
const RECONNECT_BASE_DELAY = 3_000
const RECONNECT_MAX_DELAY = 30_000

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ path, children }) => {
  const [lastMessage, setLastMessage] = useState<{ data: string } | null>(null)
  const [connected, setConnected] = useState(false)
  const [needReconnect, setNeedReconnect] = useState(false)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const staleCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectAttempts = useRef(0)
  const isConnecting = useRef(false)
  const wsUrlRef = useRef("")
  const lastMessageAt = useRef(0)
  const shouldReconnect = useRef(true)

  const cleanup = () => {
    if (ws.current) {
      // 移除所有事件监听器
      ws.current.onopen = null
      ws.current.onclose = null
      ws.current.onmessage = null
      ws.current.onerror = null

      if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close()
      }
      ws.current = null
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current)
      reconnectTimeout.current = null
    }
    if (staleCheckInterval.current) {
      clearInterval(staleCheckInterval.current)
      staleCheckInterval.current = null
    }
    setConnected(false)
  }

  const scheduleReconnect = () => {
    if (!shouldReconnect.current || reconnectTimeout.current) return

    const delay = Math.min(RECONNECT_BASE_DELAY * 2 ** reconnectAttempts.current, RECONNECT_MAX_DELAY)
    reconnectTimeout.current = setTimeout(() => {
      reconnectTimeout.current = null
      reconnectAttempts.current++
      connect()
    }, delay)
  }

  const startStaleCheck = () => {
    if (staleCheckInterval.current) {
      clearInterval(staleCheckInterval.current)
    }

    staleCheckInterval.current = setInterval(() => {
      if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return
      if (!lastMessageAt.current || Date.now() - lastMessageAt.current <= MESSAGE_IDLE_TIMEOUT) return

      console.warn(`WebSocket stale (${wsUrlRef.current}), reconnecting`)
      reconnect()
    }, STALE_CHECK_INTERVAL)
  }

  const connect = () => {
    if (isConnecting.current) {
      console.log("Connection already in progress")
      return
    }

    cleanup()
    shouldReconnect.current = true
    isConnecting.current = true

    try {
      wsUrlRef.current = nezhaWebSocketUrl(path)
      ws.current = new WebSocket(wsUrlRef.current)

      ws.current.onopen = () => {
        console.log("WebSocket connected")
        setConnected(true)
        reconnectAttempts.current = 0
        isConnecting.current = false
        lastMessageAt.current = Date.now()
        startStaleCheck()
      }

      ws.current.onclose = () => {
        console.log("WebSocket disconnected")
        setConnected(false)
        ws.current = null
        isConnecting.current = false

        scheduleReconnect()
      }

      ws.current.onmessage = (event) => {
        lastMessageAt.current = Date.now()
        setLastMessage({ data: event.data })
      }

      ws.current.onerror = (error) => {
        console.error(`WebSocket error (${wsUrlRef.current}):`, error)
        isConnecting.current = false
        scheduleReconnect()
      }
    } catch (error) {
      console.error(`WebSocket connection error (${wsUrlRef.current || path}):`, error)
      isConnecting.current = false
      scheduleReconnect()
    }
  }

  const reconnect = () => {
    reconnectAttempts.current = 0
    // 等待一个小延时确保清理完成
    cleanup()
    if (!shouldReconnect.current) return

    reconnectTimeout.current = setTimeout(() => {
      reconnectTimeout.current = null
      if (!shouldReconnect.current) return
      connect()
    }, 1000)
  }

  useEffect(() => {
    connect()

    // 添加页面卸载事件监听
    const handleBeforeUnload = () => {
      cleanup()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      shouldReconnect.current = false
      cleanup()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [path])

  const contextValue: WebSocketContextType = {
    lastMessage,
    connected,
    reconnect,
    needReconnect,
    setNeedReconnect,
  }

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>
}
