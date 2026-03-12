import DotBox from "@/components/nazhua/DotBox"
import { formatBytes } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { NezhaServer } from "@/types/nezha-api"
import dayjs from "dayjs"

function formatDate(tsSeconds?: number) {
  if (!tsSeconds) return "-"
  return dayjs(tsSeconds * 1000).format("YYYY.MM.DD HH:mm:ss")
}

export default function ServerInfoBox({ server, className }: { server: NezhaServer; className?: string }) {
  const cpuList = server.host.cpu || []
  const gpuList = server.host.gpu || []
  const load = `${Number((server.state.load_1 || 0).toFixed(2))}, ${Number((server.state.load_5 || 0).toFixed(2))}, ${Number((server.state.load_15 || 0).toFixed(2))}`
  const transferIn = server.state.net_in_transfer || 0
  const transferOut = server.state.net_out_transfer || 0
  const transferTotal = transferIn + transferOut

  return (
    <DotBox className={cn("nazhua-server-info-box", className)}>
      <div className="nazhua-server-info-group">
        <div className="nazhua-server-info-label">CPU</div>
        <div className="nazhua-server-info-content">
          {cpuList.length <= 1 ? (
            <span className="nazhua-cpu-info" title={cpuList[0] || ""}>
              <span>{cpuList[0] || "-"}</span>
            </span>
          ) : (
            <div className="nazhua-server-info-item-group">
              {cpuList.map((cpu, idx) => (
                <span key={`${server.id}_cpu_${idx}`} className="nazhua-server-info-item">
                  <span className="nazhua-server-info-item-label">{`CPU.${idx + 1}`}</span>
                  <span className="nazhua-server-info-item-value">{cpu}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {gpuList.length ? (
        <div className="nazhua-server-info-group">
          <div className="nazhua-server-info-label">GPU</div>
          <div className="nazhua-server-info-content">
            {gpuList.length <= 1 ? (
              <span className="nazhua-gpu-info" title={gpuList[0] || ""}>
                <span>{gpuList[0] || "-"}</span>
              </span>
            ) : (
              <div className="nazhua-server-info-item-group">
                {gpuList.map((gpu, idx) => (
                  <span key={`${server.id}_gpu_${idx}`} className="nazhua-server-info-item">
                    <span className="nazhua-server-info-item-label">{`GPU.${idx + 1}`}</span>
                    <span className="nazhua-server-info-item-value">{gpu}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="nazhua-server-info-group">
        <div className="nazhua-server-info-label">系统</div>
        <div className="nazhua-server-info-content">
          <span className="nazhua-server-info-item">
            <span className="nazhua-server-info-item-label">{server.host.platform || "-"}</span>
            {server.host.platform_version ? <span className="nazhua-server-info-item-value">{server.host.platform_version}</span> : null}
          </span>
        </div>
      </div>

      <div className="nazhua-server-info-group">
        <div className="nazhua-server-info-label">占用</div>
        <div className="nazhua-server-info-content">
          <div className="nazhua-server-info-item-group">
            <span className="nazhua-server-info-item">
              <span className="nazhua-server-info-item-label">进程数</span>
              <span className="nazhua-server-info-item-value">{server.state.process_count ?? "-"}</span>
            </span>
            <span className="nazhua-server-info-item">
              <span className="nazhua-server-info-item-label">负载</span>
              <span className="nazhua-server-info-item-value">{load}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="nazhua-server-info-group">
        <div className="nazhua-server-info-label">流量</div>
        <div className="nazhua-server-info-content">
          <div className="nazhua-server-info-item-group">
            <span className={cn("nazhua-server-info-item", "nazhua-transfer-in")}>
              <span className="nazhua-server-info-item-label">入</span>
              <span className="nazhua-server-info-item-value">
                <span className="nazhua-text-value">{formatBytes(transferIn)}</span>
              </span>
            </span>
            <span className={cn("nazhua-server-info-item", "nazhua-transfer-out")}>
              <span className="nazhua-server-info-item-label">出</span>
              <span className="nazhua-server-info-item-value">
                <span className="nazhua-text-value">{formatBytes(transferOut)}</span>
              </span>
            </span>
            <span className="nazhua-server-info-item">
              <span className="nazhua-server-info-item-label">总</span>
              <span className="nazhua-server-info-item-value">{formatBytes(transferTotal)}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="nazhua-server-info-group">
        <div className="nazhua-server-info-label">连接</div>
        <div className="nazhua-server-info-content">
          <div className="nazhua-server-info-item-group">
            <span className="nazhua-server-info-item">
              <span className="nazhua-server-info-item-label">TCP</span>
              <span className="nazhua-server-info-item-value">{server.state.tcp_conn_count ?? "-"}</span>
            </span>
            <span className="nazhua-server-info-item">
              <span className="nazhua-server-info-item-label">UDP</span>
              <span className="nazhua-server-info-item-value">{server.state.udp_conn_count ?? "-"}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="nazhua-server-info-group">
        <div className="nazhua-server-info-label">时间</div>
        <div className="nazhua-server-info-content">
          <div className="nazhua-server-info-item-group">
            <span className="nazhua-server-info-item">
              <span className="nazhua-server-info-item-label">启动</span>
              <span className="nazhua-server-info-item-value">{formatDate(server.host.boot_time)}</span>
            </span>
            <span className="nazhua-server-info-item">
              <span className="nazhua-server-info-item-label">最近</span>
              <span className="nazhua-server-info-item-value">
                {server.last_active && !server.last_active.startsWith("000") ? dayjs(server.last_active).format("YYYY.MM.DD HH:mm:ss") : "-"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </DotBox>
  )
}
