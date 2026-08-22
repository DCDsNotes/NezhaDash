import { type NezhaWebsocketResponse } from "@/types/nezha-api"

const MAX_MESSAGE_LENGTH = 8 * 1024 * 1024
const PRESENCE_CONFIRMATION_FRAMES = 3

export type PresenceStabilizer = {
  stable: Map<number, boolean>
  pending: Map<number, { online: boolean; frames: number }>
}

export function createPresenceStabilizer(): PresenceStabilizer {
  return { stable: new Map(), pending: new Map() }
}

/**
 * A reconnect can briefly expose one stale presence bit while the server
 * rebuilds the report stream. Confirm transitions on consecutive complete
 * frames, while keeping all other runtime fields live.
 */
export function stabilizeNezhaWsResponse(frame: NezhaWebsocketResponse, state: PresenceStabilizer): NezhaWebsocketResponse {
  const seen = new Set<number>()
  const servers = frame.servers.map((server) => {
    seen.add(server.id)
    const current = server.online
    const previous = state.stable.get(server.id)

    if (previous === undefined) {
      state.stable.set(server.id, current)
      state.pending.delete(server.id)
    } else if (current === previous) {
      state.pending.delete(server.id)
    } else {
      const pending = state.pending.get(server.id)
      const next = pending?.online === current ? { online: current, frames: pending.frames + 1 } : { online: current, frames: 1 }
      if (next.frames >= PRESENCE_CONFIRMATION_FRAMES) {
        state.stable.set(server.id, current)
        state.pending.delete(server.id)
      } else {
        state.pending.set(server.id, next)
      }
    }

    return { ...server, online: state.stable.get(server.id) ?? current }
  })

  for (const id of state.stable.keys()) {
    if (!seen.has(id)) {
      state.stable.delete(id)
      state.pending.delete(id)
    }
  }

  const online = servers.reduce((count, server) => count + Number(server.online), 0)
  return { ...frame, online, offline: servers.length - online, servers }
}

export function parseNezhaWsMessage(data: string | undefined | null): NezhaWebsocketResponse | null {
  if (!data || data.length > MAX_MESSAGE_LENGTH) return null

  try {
    const parsed = JSON.parse(data) as Partial<NezhaWebsocketResponse> | null
    if (
      !parsed ||
      !Number.isFinite(Number(parsed.now)) ||
      !Number.isFinite(Number(parsed.online)) ||
      !Number.isFinite(Number(parsed.offline)) ||
      !Array.isArray(parsed.servers) ||
      parsed.servers.some((server) => !server || typeof server.online !== "boolean")
    ) {
      return null
    }

    return {
      now: Number(parsed.now),
      online: Number(parsed.online),
      offline: Number(parsed.offline),
      servers: parsed.servers,
    }
  } catch {
    return null
  }
}
