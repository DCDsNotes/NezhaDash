import type { NezhaServer } from "@/types/nezha-api"

import { md5_8 } from "./md5"

export function serverHashId(serverId: number | string) {
  return md5_8(String(serverId))
}

export function serverPath(serverId: number | string) {
  return `/server/${serverHashId(serverId)}`
}

export function resolveServerIdFromRouteParam(param: string, servers: NezhaServer[]) {
  // Support legacy numeric id.
  if (/^\d+$/.test(param)) return Number(param)
  const found = servers.find((s) => serverHashId(s.id) === param)
  return found?.id
}

