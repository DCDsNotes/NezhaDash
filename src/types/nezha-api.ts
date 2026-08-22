export interface NezhaWebsocketResponse {
  now: number
  online: number
  offline: number
  servers: NezhaServer[]
}

export interface NezhaServer {
  id: number
  name: string
  public_note: string
  online: boolean
  last_active: string
  country_code: string
  host: NezhaServerHost
  state: NezhaServerStatus
}

export interface NezhaServerHost {
  platform: string
  platform_version: string
  cpu: string[]
  gpu: string[]
  mem_total: number
  disk_total: number
  swap_total: number
  arch: string
  boot_time: number
  version: string
}

export interface NezhaServerStatus {
  cpu: number
  mem_used: number
  swap_used: number
  disk_used: number
  net_in_transfer: number
  net_out_transfer: number
  net_in_speed: number
  net_out_speed: number
  uptime: number
  load_1: number
  load_5: number
  load_15: number
  tcp_conn_count: number
  udp_conn_count: number
  process_count: number
  temperatures: temperature[]
  gpu: number[]
}

interface temperature {
  Name: string
  Temperature: number
}

export interface ServerGroupResponse {
  success: boolean
  data: ServerGroup[]
}

export interface ServerGroup {
  group: {
    id: number
    created_at: string
    updated_at: string
    name: string
  }
  servers: number[]
}

export interface LoginUserResponse {
  success: boolean
  data: {
    id: number
    username: string
  }
}

export interface ServiceHistoryCollectionResponse {
  success: boolean
  data: ServiceHistory[]
}

export interface ServiceHistory {
  service_id: number
  service_name: string
  servers: Array<{
    server_id: number
    server_name: string
    stats: {
      avg_delay: number
      up_percent: number
      total_up: number
      total_down: number
      data_points?: Array<{
        ts: number
        delay: number
        status: number
      }>
    }
  }>
}

export interface ServerTrafficResponse {
  success: boolean
  data: {
    from: string
    to: string
    servers: Record<string, { server_id: number; in: number; out: number }>
  }
}

export interface ServerNetworkHistoryResponse {
  success: boolean
  data: ServerNetworkHistory
}

export interface ServerMetricsBatchResponse {
  success: boolean
  data: {
    server_id: number
    server_name: string
    metrics: Record<string, Array<{ ts: number; value: number }>>
  }
}

export interface ServerNetworkHistory {
  server_id: number
  server_name: string
  created_at: number[]
  net_in_speed: number[]
  net_out_speed: number[]
}

export interface NezhaMonitor {
  monitor_id: number
  monitor_name: string
  server_id: number
  server_name: string
  created_at: number[]
  avg_delay: number[]
  packet_loss?: number[]
}

type SettingConfig = {
  debug: boolean
  language: string
  site_name: string
  user_template: string
  admin_template: string
  custom_code: string
}

export interface SettingResponse {
  success: boolean
  data: {
    config: SettingConfig
    version: string
  }
}
