import { LoginUserResponse, MonitorResponse, ServerGroupResponse, ServerSpeedHistoryResponse, SettingResponse } from "@/types/nezha-api"

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
  return fetchApi<MonitorResponse>(`/service/${serverId}`, { signal })
}

export const fetchServerSpeedHistory = async (serverId: number, signal?: AbortSignal): Promise<ServerSpeedHistoryResponse> => {
  return fetchApi<ServerSpeedHistoryResponse>(`/server-speed/${serverId}`, { signal })
}

export const fetchSetting = async (signal?: AbortSignal): Promise<SettingResponse> => {
  return fetchApi<SettingResponse>("/setting", { signal })
}
