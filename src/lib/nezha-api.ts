import {
  LoginUserResponse,
  NezhaMonitor,
  ServerGroupResponse,
  ServerMetricsResponse,
  ServerNetworkHistoryResponse,
  ServerTrafficResponse,
  ServiceHistoryCollectionResponse,
  ServiceHistoryResponse,
  ServiceOverviewResponse,
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

const HISTORY_CONCURRENCY = 4

export const fetchServiceHistories = async (signal?: AbortSignal): Promise<ServiceHistoryCollectionResponse> => {
  const overview = await fetchApi<ServiceOverviewResponse>("/service", { signal })
  const serviceIds = Object.keys(overview.data.services || {}).map(Number).filter(Number.isFinite)
  const histories = new Array<ServiceHistoryResponse["data"] | undefined>(serviceIds.length)
  const errors: unknown[] = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < serviceIds.length) {
      const index = nextIndex++
      try {
        const response = await fetchApi<ServiceHistoryResponse>(`/service/${serviceIds[index]}/history`, { signal })
        histories[index] = response.data
      } catch (error) {
        if (signal?.aborted) throw error
        errors.push(error)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(HISTORY_CONCURRENCY, serviceIds.length) }, worker))
  const data = histories.filter((history): history is ServiceHistoryResponse["data"] => Boolean(history))
  if (serviceIds.length > 0 && data.length === 0 && errors.length > 0) throw errors[0]
  return { success: overview.success, data }
}

export function selectServerMonitorHistory(histories: ServiceHistoryCollectionResponse | undefined, serverId: number): NezhaMonitor[] {
  if (!histories?.success || !serverId) return []
  return histories.data.flatMap((history) => {
    const server = history.servers.find((item) => Number(item.server_id) === serverId)
    if (!server) return []
    const points = server.stats.data_points || []
    return [{
      monitor_id: Number(history.service_id),
      monitor_name: history.service_name,
      server_id: serverId,
      server_name: server.server_name,
      created_at: points.map((point) => Number(point.ts)),
      avg_delay: points.map((point) => Number(point.delay) || 0),
      packet_loss: points.map((point) => (Number(point.status) === 1 ? 0 : 100)),
    }]
  })
}

export const fetchTodayServerTraffic = async (signal?: AbortSignal): Promise<ServerTrafficResponse> => {
  return fetchApi<ServerTrafficResponse>("/server/traffic", { signal })
}

function fetchServerMetric(serverId: number, metric: "net_in_speed" | "net_out_speed", signal?: AbortSignal) {
  return fetchApi<ServerMetricsResponse>(`/server/${serverId}/metrics?metric=${metric}`, { signal })
}

export const fetchServerNetworkMetrics = async (serverId: number, signal?: AbortSignal): Promise<ServerNetworkHistoryResponse> => {
  const [inbound, outbound] = await Promise.all([
    fetchServerMetric(serverId, "net_in_speed", signal),
    fetchServerMetric(serverId, "net_out_speed", signal),
  ])
  const inboundByTime = new Map(inbound.data.data_points.map((point) => [Number(point.ts), Number(point.value) || 0]))
  const outboundByTime = new Map(outbound.data.data_points.map((point) => [Number(point.ts), Number(point.value) || 0]))
  const createdAt = Array.from(new Set([...inboundByTime.keys(), ...outboundByTime.keys()]))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)

  return {
    success: inbound.success && outbound.success,
    data: {
      server_id: serverId,
      server_name: inbound.data.server_name || outbound.data.server_name,
      created_at: createdAt,
      net_in_speed: createdAt.map((time) => inboundByTime.get(time) || 0),
      net_out_speed: createdAt.map((time) => outboundByTime.get(time) || 0),
    },
  }
}

export const fetchSetting = async (signal?: AbortSignal): Promise<SettingResponse> => {
  return fetchApi<SettingResponse>("/setting", { signal })
}
