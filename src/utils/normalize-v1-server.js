import validate from '@/utils/validate';
import { serverIdToServerKey } from '@/utils/server-key';

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parsePublicNote(publicNote) {
  if (!publicNote) return null;
  try {
    if (typeof publicNote === 'string') {
      return JSON.parse(publicNote);
    }
    if (typeof publicNote === 'object') {
      return publicNote;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function normalizeToArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (validate.isSet(value)) {
    return [value];
  }
  return [];
}

/**
 * Normalize Nezha v1 server payload into a stable UI-friendly shape.
 * This project is v1-only, but the UI expects a few legacy field names.
 */
export default function normalizeV1Server(v1Server, groupName) {
  const id = v1Server?.id;
  const host = v1Server?.host || {};
  const state = v1Server?.state || {};

  const normalized = {
    ID: id,
    Name: v1Server?.name,
    Tag: groupName,
    DisplayIndex: toFiniteNumber(v1Server?.display_index, 0),
    LastActive: v1Server?.last_active,
    Host: {
      Platform: host?.platform,
      PlatformVersion: host?.platform_version,
      CPU: normalizeToArray(host?.cpu),
      MemTotal: toFiniteNumber(host?.mem_total, 0),
      DiskTotal: toFiniteNumber(host?.disk_total, 0),
      SwapTotal: toFiniteNumber(host?.swap_total, 0),
      Arch: host?.arch,
      Virtualization: host?.virtualization,
      BootTime: toFiniteNumber(host?.boot_time, 0),
      CountryCode: v1Server?.country_code,
      Version: host?.version,
      GPU: normalizeToArray(host?.gpu),
    },
    State: {
      CPU: toFiniteNumber(state?.cpu, 0),
      MemUsed: toFiniteNumber(state?.mem_used, 0),
      SwapUsed: toFiniteNumber(state?.swap_used, 0),
      DiskUsed: toFiniteNumber(state?.disk_used, 0),
      NetInTransfer: toFiniteNumber(state?.net_in_transfer, 0),
      NetOutTransfer: toFiniteNumber(state?.net_out_transfer, 0),
      NetInSpeed: toFiniteNumber(state?.net_in_speed, 0),
      NetOutSpeed: toFiniteNumber(state?.net_out_speed, 0),
      Uptime: toFiniteNumber(state?.uptime, 0),
      Load1: toFiniteNumber(state?.load_1, 0),
      Load5: toFiniteNumber(state?.load_5, 0),
      Load15: toFiniteNumber(state?.load_15, 0),
      TcpConnCount: toFiniteNumber(state?.tcp_conn_count, 0),
      UdpConnCount: toFiniteNumber(state?.udp_conn_count, 0),
      ProcessCount: toFiniteNumber(state?.process_count, 0),
      Temperatures: state?.temperatures,
      GPU: state?.gpu,
    },
    PublicNote: parsePublicNote(v1Server?.public_note),
  };

  normalized.ServerKey = serverIdToServerKey(normalized.ID);
  return normalized;
}
