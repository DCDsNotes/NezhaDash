import {
  LoginUserResponse,
  MonitorResponse,
  ServerGroupResponse,
  ServerSpeedHistoryResponse,
  ServerTransferStatsResponse,
  SettingResponse,
} from "@/types/nezha-api"

import { nezhaApiUrl } from "./nezha-endpoints"

let latestRefreshTokenAt = 0

type ErrorPayload = {
  error?: string
}

export class NezhaApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "NezhaApiError"
    this.status = status
  }
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(nezhaApiUrl(path), {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  })
  let data: T & ErrorPayload

  try {
    const payload: unknown = await response.json()
    if (!payload || typeof payload !== "object") throw new TypeError("Invalid JSON payload")
    data = payload as T & ErrorPayload
  } catch (error) {
    if (init?.signal?.aborted) throw error
    throw new NezhaApiError(`请求返回了无效数据 (${response.status})`, response.status)
  }

  if (!response.ok || data.error) {
    const message = typeof data.error === "string" && data.error.length <= 256 ? data.error : `请求失败 (${response.status})`
    throw new NezhaApiError(message, response.status)
  }

  return data
}

export const fetchServerGroup = async (signal?: AbortSignal): Promise<ServerGroupResponse> => {
  return fetchApi<ServerGroupResponse>("/server-group", { signal })
}

export const fetchLoginUser = async (signal?: AbortSignal): Promise<LoginUserResponse> => {
  const response = await fetchApi<LoginUserResponse>("/profile", { cache: "no-store", signal })

  if (response.data?.id && (!latestRefreshTokenAt || Date.now() - latestRefreshTokenAt > 60 * 60_000)) {
    latestRefreshTokenAt = Date.now()
    void fetch(nezhaApiUrl("/refresh-token"), { cache: "no-store", credentials: "same-origin", signal }).catch(() => {})
  }

  // Keep only the fields used by the public dashboard. Some older API versions
  // include password metadata in this response, which must not remain in cache.
  return {
    success: response.success,
    data: {
      id: Number(response.data?.id || 0),
      username: String(response.data?.username || ""),
    },
  }
}

export const fetchMonitor = async (serverId: number, signal?: AbortSignal): Promise<MonitorResponse> => {
  return fetchApi<MonitorResponse>(`/server/${serverId}/service`, { signal })
}

export const fetchServerSpeedHistory = async (serverId: number, signal?: AbortSignal): Promise<ServerSpeedHistoryResponse> => {
  type MetricResponse = {
    success: boolean
    data: {
      server_id: number
      server_name: string
      metric: string
      data_points: Array<{ ts: number; value: number }>
    }
  }

  const [inResponse, outResponse] = await Promise.all([
    fetchApi<MetricResponse>(`/server/${serverId}/metrics?metric=net_in_speed&period=1d`, { signal }),
    fetchApi<MetricResponse>(`/server/${serverId}/metrics?metric=net_out_speed&period=1d`, { signal }),
  ])

  const inPoints = Array.isArray(inResponse.data?.data_points) ? inResponse.data.data_points : []
  const outPoints = Array.isArray(outResponse.data?.data_points) ? outResponse.data.data_points : []
  const timestamps = Array.from(new Set([...inPoints, ...outPoints].map((point) => Number(point.ts)).filter(Number.isFinite))).sort(
    (a, b) => a - b,
  )
  const inByTime = new Map(inPoints.map((point) => [Number(point.ts), Number(point.value) || 0]))
  const outByTime = new Map(outPoints.map((point) => [Number(point.ts), Number(point.value) || 0]))

  return {
    success: inResponse.success && outResponse.success,
    data: {
      server_id: Number(inResponse.data?.server_id || outResponse.data?.server_id || serverId),
      server_name: String(inResponse.data?.server_name || outResponse.data?.server_name || ""),
      created_at: timestamps,
      net_in_speed: timestamps.map((timestamp) => inByTime.get(timestamp) || 0),
      net_out_speed: timestamps.map((timestamp) => outByTime.get(timestamp) || 0),
    },
  }
}

export const fetchServerTransferStats = async (signal?: AbortSignal): Promise<ServerTransferStatsResponse> => {
  return fetchApi<ServerTransferStatsResponse>("/server/transfer", { signal })
}

export const fetchSetting = async (signal?: AbortSignal): Promise<SettingResponse> => {
  return fetchApi<SettingResponse>("/setting", { signal })
}
