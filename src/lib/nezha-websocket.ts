import { type NezhaWebsocketResponse } from "@/types/nezha-api"

const MAX_MESSAGE_LENGTH = 8 * 1024 * 1024

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
