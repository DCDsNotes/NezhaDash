import { useMemo } from "react"

import { getServerDetailInfoViewModel } from "@/lib/server-view-model"
import { NezhaServer } from "@/types/nezha-api"

export default function ServerDetailInfoBox({ now, server }: { now: number; server: NezhaServer }) {
  const viewModel = useMemo(() => getServerDetailInfoViewModel(now, server), [now, server])
  const { bootTime, cpuList, gpuList, lastActive, platformVersion, systemLabel, tagList, temperatureItems, trafficTypeLabel } = viewModel

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

      {temperatureItems.length > 0 ? (
        <div className="server-info-group server-info--temperature">
          <div className="server-info-label">温度</div>
          <div className="server-info-content">
            <div className="server-info-item-group">
              {temperatureItems.map((item, idx) => (
                <span key={`${server.id}_temp_${idx}`} className="server-info-item" title={item.title}>
                  <span className="server-info-item-icon">
                    <i className={item.iconClass} />
                  </span>
                  <span className="server-info-item-label" title={item.label}>
                    {item.label}
                  </span>
                  <span className="server-info-item-value">{item.value}</span>
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
              <span className="server-info-item-value">{viewModel.processCount}</span>
            </span>
            <span className="server-info-item load">
              <span className="server-info-item-label">负载</span>
              <span className="server-info-item-value">{viewModel.loadText}</span>
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
                <span className="text-value">{viewModel.transferInText}</span>
              </span>
            </span>
            <span className="server-info-item transfer--out">
              <span className="server-info-item-label">出</span>
              <span className="server-info-item-value">
                <span className="text-value">{viewModel.transferOutText}</span>
              </span>
            </span>
            <span className="server-info-item transfer--total" title={viewModel.transferTotalTitle}>
              <span className="server-info-item-label">{trafficTypeLabel}</span>
              <span className="server-info-item-value">{viewModel.transferTotalText}</span>
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
              <span className="server-info-item-value">{viewModel.tcpText}</span>
            </span>
            <span className="server-info-item">
              <span className="server-info-item-label">UDP</span>
              <span className="server-info-item-value">{viewModel.udpText}</span>
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
