import { getExplicitServerOnline, getServerLastActiveTime, isServerOnline } from "@/lib/server-normalizer"
import { type NezhaWebsocketResponse } from "@/types/nezha-api"

const MAX_MESSAGE_LENGTH = 8 * 1024 * 1024
const OFFLINE_CONFIRMATION_FRAMES = 3
const EXPLICIT_OFFLINE_CONFIRMATION_FRAMES = 2

type ServerPresence = {
  lastActive: NezhaWebsocketResponse["servers"][number]["last_active"]
  lastActiveTime: number
  staleFrames: number
  online: boolean
}

export function parseNezhaWsMessage(data: string | undefined | null): NezhaWebsocketResponse | null {
  if (!data || data.length > MAX_MESSAGE_LENGTH) return null

  try {
    const parsed = JSON.parse(data) as Partial<NezhaWebsocketResponse> | null
    if (!parsed || !Number.isFinite(Number(parsed.now)) || !Array.isArray(parsed.servers)) return null
    return {
      now: Number(parsed.now),
      ...(Number.isFinite(Number(parsed.online)) ? { online: Number(parsed.online) } : {}),
      ...(Number.isFinite(Number(parsed.offline)) ? { offline: Number(parsed.offline) } : {}),
      servers: parsed.servers,
    }
  } catch {
    return null
  }
}

export function createServerPresenceStabilizer() {
  const presenceByServer = new Map<number, ServerPresence>()

  return (data: NezhaWebsocketResponse): NezhaWebsocketResponse => {
    const visibleServerIds = new Set<number>()
    let changed = false

    const servers = data.servers.map((server) => {
      const serverId = Number(server.id)
      visibleServerIds.add(serverId)

      const previous = presenceByServer.get(serverId)
      const observedLastActiveTime = getServerLastActiveTime(server)
      const keepPreviousTimestamp = Boolean(previous?.lastActiveTime && observedLastActiveTime < previous.lastActiveTime)
      const lastActive = keepPreviousTimestamp && previous ? previous.lastActive : server.last_active
      const lastActiveTime = keepPreviousTimestamp && previous ? previous.lastActiveTime : observedLastActiveTime
      const candidate = keepPreviousTimestamp ? { ...server, last_active: lastActive } : server
      const explicitOnline = getExplicitServerOnline(server)
      const observedOnline = isServerOnline(data.now, candidate)

      let staleFrames = observedOnline ? 0 : (previous?.staleFrames || 0) + 1
      let online = observedOnline
      const confirmationFrames = explicitOnline === false ? EXPLICIT_OFFLINE_CONFIRMATION_FRAMES : OFFLINE_CONFIRMATION_FRAMES
      if (!observedOnline && previous?.online && staleFrames < confirmationFrames) online = true
      if (observedOnline) staleFrames = 0

      presenceByServer.set(serverId, { lastActive, lastActiveTime, staleFrames, online })

      if (!keepPreviousTimestamp && server.online === online) return server
      changed = true
      return { ...server, last_active: lastActive, online }
    })

    presenceByServer.forEach((_, serverId) => {
      if (!visibleServerIds.has(serverId)) presenceByServer.delete(serverId)
    })

    return changed ? { ...data, servers } : data
  }
}
