import { LoginUserResponse, MonitorResponse, ServerGroupResponse, ServerSpeedHistoryResponse, SettingResponse } from "@/types/nezha-api"

import { nezhaApiUrl } from "./nezha-endpoints"

let lastestRefreshTokenAt = 0

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
  const response = await fetch(nezhaApiUrl(path), init)
  let data: T & ErrorPayload

  try {
    data = (await response.json()) as T & ErrorPayload
  } catch {
    throw new NezhaApiError(`请求返回了无效数据 (${response.status})`, response.status)
  }

  if (!response.ok || data.error) {
    throw new NezhaApiError(data.error || `请求失败 (${response.status})`, response.status)
  }

  return data
}

export const fetchServerGroup = async (): Promise<ServerGroupResponse> => {
  return fetchApi<ServerGroupResponse>("/server-group")
}

export const fetchLoginUser = async (): Promise<LoginUserResponse> => {
  const data = await fetchApi<LoginUserResponse>("/profile")

  // auto refresh token
  if (document.cookie && (!lastestRefreshTokenAt || Date.now() - lastestRefreshTokenAt > 1000 * 60 * 60)) {
    lastestRefreshTokenAt = Date.now()
    void fetch(nezhaApiUrl("/refresh-token")).catch(() => {})
  }

  return data
}

export const fetchMonitor = async (server_id: number): Promise<MonitorResponse> => {
  return fetchApi<MonitorResponse>(`/service/${server_id}`)
}

export const fetchServerSpeedHistory = async (server_id: number): Promise<ServerSpeedHistoryResponse> => {
  return fetchApi<ServerSpeedHistoryResponse>(`/server-speed/${server_id}`)
}

export const fetchSetting = async (): Promise<SettingResponse> => {
  return fetchApi<SettingResponse>("/setting")
}
