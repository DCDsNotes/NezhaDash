import dayjs from "dayjs"
import { useMemo } from "react"

import { formatBytes } from "@/lib/format"
import { GetOsName } from "@/lib/logo-class"
import { calcBinary } from "@/lib/server-spec"
import { formatNezhaInfo, parsePublicNote } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"

function formatLoad(server: NezhaServer) {
  const l1 = Number(server.state?.load_1 || 0).toFixed(2)
  const l5 = Number(server.state?.load_5 || 0).toFixed(2)
  const l15 = Number(server.state?.load_15 || 0).toFixed(2)
  return `${l1},${l5},${l15}`
}

function formatTransferShort(bytes: number) {
  const s = calcBinary(bytes)
  if (s.p && s.p > 1) return `${Number(s.p.toFixed(1))}P`
  if (s.t > 1) return `${Number(s.t.toFixed(2))}T`
  if (s.g > 1) return `${Number(s.g.toFixed(2))}G`
  if (s.m > 1) return `${Number(s.m.toFixed(1))}M`
  return `${Number(s.k.toFixed(1))}K`
}

export default function ServerDetailInfoBox({ now, server }: { now: number; server: NezhaServer }) {
  const info = useMemo(() => formatNezhaInfo(now, server), [now, server])
  const parsedNote = useMemo(() => parsePublicNote(info.public_note), [info.public_note])

  const cpuList = server.host?.cpu || []
  const gpuList = server.host?.gpu || []
  const temperatures = server.state?.temperatures || []

  const systemLabel = GetOsName(server.host?.platform || "")
  const platformVersion = server.host?.platform_version || ""

  const bootTime = server.host?.boot_time ? dayjs(server.host.boot_time * 1000).format("YYYY.MM.DD HH:mm:ss") : "-"
  const lastActive = info.last_active_time_string ? dayjs(info.last_active_time_string).format("YYYY.MM.DD HH:mm:ss") : "-"

  const transferIn = server.state?.net_in_transfer || 0
  const transferOut = server.state?.net_out_transfer || 0
  const transferTotal = transferIn + transferOut

  const tagList = useMemo(() => {
    const list: string[] = []
    const plan = parsedNote?.planDataMod
    if (plan?.networkRoute) list.push(...String(plan.networkRoute).split(",").filter(Boolean))
    if (plan?.extra) list.push(...String(plan.extra).split(",").filter(Boolean))
    if (plan?.IPv4 === "1" && plan?.IPv6 === "1") list.push("双栈IP")
    else if (plan?.IPv4 === "1") list.push("仅IPv4")
    else if (plan?.IPv6 === "1") list.push("仅IPv6")
    return list
  }, [parsedNote?.planDataMod])

  const trafficTypeLabel = useMemo(() => {
    const t = parsedNote?.planDataMod?.trafficType
    if (t === "1") return "单向出"
    if (t === "3") return "单向取最大"
    return "双向"
  }, [parsedNote?.planDataMod?.trafficType])

  function getTemperatureIconClass(label: string) {
    const name = String(label || "").toLowerCase()
    if (name.includes("cpu")) return "ri-cpu-line"
    if (name.includes("gpu")) return "ri-gamepad-line"
    if (name.includes("nvme")) return "ri-hard-drive-3-line"
    if (name.includes("motherboard")) return "ri-instance-line"
    return "ri-temp-hot-line"
  }

  return (
    <div className="server-info-box nazha-box">
      <div className="server-info-group server-info--cpu">
        <div className="server-info-label">CPU</div>
        <div className="server-info-content">
          {cpuList.length === 1 ? (
            <span className="cpu-info" title={cpuList[0]}>
              <span>{cpuList[0]}</span>
            </span>
          ) : (
            <div className="server-info-item-group">
              {cpuList.map((cpuItem, idx) => (
                <span key={`${server.id}_cpu_${idx}`} className="server-info-item">
                  <span className="server-info-item-label">CPU.{idx + 1}</span>
                  <span className="server-info-item-value">{cpuItem}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {gpuList.length > 0 ? (
        <div className="server-info-group server-info--gpu">
          <div className="server-info-label">GPU</div>
          <div className="server-info-content">
            {gpuList.length === 1 ? (
              <span className="gpu-info" title={gpuList[0]}>
                <span>{gpuList[0]}</span>
              </span>
            ) : (
              <div className="server-info-item-group">
                {gpuList.map((gpuItem, idx) => (
                  <span key={`${server.id}_gpu_${idx}`} className="server-info-item">
                    <span className="server-info-item-label">GPU.{idx + 1}</span>
                    <span className="server-info-item-value">{gpuItem}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {temperatures.length > 0 ? (
        <div className="server-info-group server-info--temperature">
          <div className="server-info-label">温度</div>
          <div className="server-info-content">
            <div className="server-info-item-group">
              {temperatures.map((item, idx) => (
                <span key={`${server.id}_temp_${idx}`} className="server-info-item" title={`${item.Name}: ${item.Temperature.toFixed(2)}°C`}>
                  <span className="server-info-item-icon">
                    <i className={getTemperatureIconClass(item.Name)} />
                  </span>
                  <span className="server-info-item-label" title={item.Name}>
                    {item.Name}
                  </span>
                  <span className="server-info-item-value">{item.Temperature.toFixed(1)}°C</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="server-info-group server-info--system-os">
        <div className="server-info-label">系统</div>
        <div className="server-info-content">
          <span className="server-info-item">
            <span className="server-info-item-label">{systemLabel}</span>
            {platformVersion ? <span className="server-info-item-value">{platformVersion}</span> : null}
          </span>
        </div>
      </div>

      <div className="server-info-group server-info--load">
        <div className="server-info-label">占用</div>
        <div className="server-info-content">
          <div className="server-info-item-group">
            <span className="server-info-item process-count">
              <span className="server-info-item-label">进程数</span>
              <span className="server-info-item-value">{server.state?.process_count ?? 0}</span>
            </span>
            <span className="server-info-item load">
              <span className="server-info-item-label">负载</span>
              <span className="server-info-item-value">{formatLoad(server)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="server-info-group server-info--transfer">
        <div className="server-info-label">流量</div>
        <div className="server-info-content">
          <div className="server-info-item-group">
            <span className="server-info-item transfer--in">
              <span className="server-info-item-label">入</span>
              <span className="server-info-item-value">
                <span className="text-value">{formatTransferShort(transferIn)}</span>
              </span>
            </span>
            <span className="server-info-item transfer--out">
              <span className="server-info-item-label">出</span>
              <span className="server-info-item-value">
                <span className="text-value">{formatTransferShort(transferOut)}</span>
              </span>
            </span>
            <span className="server-info-item transfer--total" title={formatBytes(transferTotal)}>
              <span className="server-info-item-label">{trafficTypeLabel}</span>
              <span className="server-info-item-value">{formatTransferShort(transferTotal)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="server-info-group server-info--conns">
        <div className="server-info-label">连接</div>
        <div className="server-info-content">
          <div className="server-info-item-group">
            <span className="server-info-item">
              <span className="server-info-item-label">TCP</span>
              <span className="server-info-item-value">{server.state?.tcp_conn_count ?? "-"}</span>
            </span>
            <span className="server-info-item">
              <span className="server-info-item-label">UDP</span>
              <span className="server-info-item-value">{server.state?.udp_conn_count ?? "-"}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="server-info-group server-info--boot">
        <div className="server-info-label">启动</div>
        <div className="server-info-content">
          <span className="server-info-item">
            <span className="server-info-item-value">{bootTime}</span>
          </span>
        </div>
      </div>

      <div className="server-info-group server-info--active">
        <div className="server-info-label">活跃</div>
        <div className="server-info-content">
          <span className="server-info-item">
            <span className="server-info-item-value">{lastActive}</span>
          </span>
        </div>
      </div>

      {tagList.length > 0 ? (
        <div className="server-info-group server-info--tags">
          <div className="server-info-label">标签</div>
          <div className="server-info-content">
            <div className="server-info-tag-list">
              {tagList.map((tag, idx) => (
                <span key={`${server.id}_tag_${idx}`} className="server-info-tag-item">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
