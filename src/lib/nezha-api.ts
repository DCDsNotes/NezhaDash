import { LoginUserResponse, MonitorResponse, ServerGroupResponse, ServerSpeedHistoryResponse, SettingResponse } from "@/types/nezha-api"

import { nezhaApiUrl } from "./nezha-endpoints"

let lastestRefreshTokenAt = 0

export const fetchServerGroup = async (): Promise<ServerGroupResponse> => {
  const response = await fetch(nezhaApiUrl("/server-group"))
  const data = await response.json()
  if (data.error) {
    throw new Error(data.error)
  }
  return data
}

export const fetchLoginUser = async (): Promise<LoginUserResponse> => {
  const response = await fetch(nezhaApiUrl("/profile"))
  const data = await response.json()
  if (data.error) {
    throw new Error(data.error)
  }

  // auto refresh token
  if (document.cookie && (!lastestRefreshTokenAt || Date.now() - lastestRefreshTokenAt > 1000 * 60 * 60)) {
    lastestRefreshTokenAt = Date.now()
    fetch(nezhaApiUrl("/refresh-token"))
  }

  return data
}

export const fetchMonitor = async (server_id: number): Promise<MonitorResponse> => {
  const response = await fetch(nezhaApiUrl(`/service/${server_id}`))
  const data = await response.json()
  if (data.error) {
    throw new Error(data.error)
  }
  return data
}

export const fetchServerSpeedHistory = async (server_id: number): Promise<ServerSpeedHistoryResponse> => {
  const response = await fetch(nezhaApiUrl(`/server-speed/${server_id}`))
  const data = await response.json()
  if (data.error) {
    throw new Error(data.error)
  }
  return data
}

export const fetchSetting = async (): Promise<SettingResponse> => {
  const response = await fetch(nezhaApiUrl("/setting"))
  const data = await response.json()
  if (data.error) {
    throw new Error(data.error)
  }
  return data
}
