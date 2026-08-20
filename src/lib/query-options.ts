import { queryOptions } from "@tanstack/react-query"

import { fetchLoginUser, fetchServerGroup, fetchServerMonitorHistory, fetchServerNetworkMetrics, fetchSetting } from "./nezha-api"

export const queryKeys = {
  setting: ["setting"] as const,
  loginUser: ["login-user"] as const,
  serverGroups: ["server-group"] as const,
  monitor: (serverId: number) => ["monitor", serverId] as const,
  serverMetrics: (serverId: number) => ["server-metrics", serverId] as const,
}

export function settingQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.setting,
    queryFn: ({ signal }) => fetchSetting(signal),
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  })
}

export function loginUserQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.loginUser,
    queryFn: ({ signal }) => fetchLoginUser(signal),
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: "always",
    retry: 0,
  })
}

export function serverGroupsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.serverGroups,
    queryFn: ({ signal }) => fetchServerGroup(signal),
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  })
}

export function monitorQueryOptions(serverId: number) {
  return queryOptions({
    queryKey: queryKeys.monitor(serverId),
    queryFn: ({ signal }) => fetchServerMonitorHistory(serverId, signal),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  })
}

export function serverMetricsQueryOptions(serverId: number) {
  return queryOptions({
    queryKey: queryKeys.serverMetrics(serverId),
    queryFn: ({ signal }) => fetchServerNetworkMetrics(serverId, signal),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  })
}
