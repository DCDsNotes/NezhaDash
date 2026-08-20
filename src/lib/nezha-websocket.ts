import { type NezhaWebsocketResponse } from "@/types/nezha-api"

const MAX_MESSAGE_LENGTH = 8 * 1024 * 1024

export function parseNezhaWsMessage(data: string | undefined | null): NezhaWebsocketResponse | null {
  if (!data || data.length > MAX_MESSAGE_LENGTH) return null

  try {
    const parsed = JSON.parse(data) as Partial<NezhaWebsocketResponse> | null
    if (!parsed || !Number.isFinite(Number(parsed.now)) || !Array.isArray(parsed.servers)) return null
    const response: NezhaWebsocketResponse = { now: Number(parsed.now), servers: parsed.servers }
    if (Number.isFinite(Number(parsed.online))) response.online = Number(parsed.online)
    if (Number.isFinite(Number(parsed.offline))) response.offline = Number(parsed.offline)
    return response
  } catch {
    return null
  }
}
