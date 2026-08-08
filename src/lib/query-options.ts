import { queryOptions } from "@tanstack/react-query"

import { fetchLoginUser, fetchMonitor, fetchServerGroup, fetchServerSpeedHistory, fetchSetting } from "./nezha-api"

export const queryKeys = {
  setting: ["setting"] as const,
  loginUser: ["login-user"] as const,
  serverGroups: ["server-group"] as const,
  monitor: (serverId: number) => ["monitor", serverId] as const,
  serverSpeed: (serverId: number) => ["server-speed", serverId] as const,
}

export function settingQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.setting,
    queryFn: fetchSetting,
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

export function loginUserQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.loginUser,
    queryFn: fetchLoginUser,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 0,
  })
}

export function serverGroupsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.serverGroups,
    queryFn: fetchServerGroup,
    staleTime: 60_000,
  })
}

export function monitorQueryOptions(serverId: number) {
  return queryOptions({
    queryKey: queryKeys.monitor(serverId),
    queryFn: () => fetchMonitor(serverId),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  })
}

export function serverSpeedQueryOptions(serverId: number) {
  return queryOptions({
    queryKey: queryKeys.serverSpeed(serverId),
    queryFn: () => fetchServerSpeedHistory(serverId),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  })
}
