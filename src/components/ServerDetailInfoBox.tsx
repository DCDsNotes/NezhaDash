import { getServerDetailInfoViewModel } from "@/lib/server-view-model"
import { NezhaServer } from "@/types/nezha-api"
import { useMemo, useState } from "react"

export default function ServerDetailInfoBox({ now, server }: { now: number; server: NezhaServer }) {
  const viewModel = useMemo(() => getServerDetailInfoViewModel(now, server), [now, server])
  const { bootTime, cpuList, gpuList, lastActive, platformVersion, systemLabel, tagList, temperatureItems } = viewModel
  const [openTransferPopover, setOpenTransferPopover] = useState<string | null>(null)

  return (
    <div className="server-detail-info nazha-box">
      <div className="server-detail-info__group server-detail-info__group--cpu">
        <div className="server-detail-info__label">CPU</div>
        <div className="server-detail-info__content">
          {cpuList.length === 1 ? (
            <span className="cpu-info" title={cpuList[0]}>
              <span>{cpuList[0]}</span>
            </span>
          ) : (
            <div className="server-detail-info__items">
              {cpuList.map((cpuItem, idx) => (
                <span key={`${server.id}_cpu_${idx}`} className="server-detail-info__item">
                  <span className="server-detail-info__item-label">CPU.{idx + 1}</span>
                  <span className="server-detail-info__item-value">{cpuItem}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {gpuList.length > 0 ? (
        <div className="server-detail-info__group server-detail-info__group--gpu">
          <div className="server-detail-info__label">GPU</div>
          <div className="server-detail-info__content">
            {gpuList.length === 1 ? (
              <span className="gpu-info" title={gpuList[0]}>
                <span>{gpuList[0]}</span>
              </span>
            ) : (
              <div className="server-detail-info__items">
                {gpuList.map((gpuItem, idx) => (
                  <span key={`${server.id}_gpu_${idx}`} className="server-detail-info__item">
                    <span className="server-detail-info__item-label">GPU.{idx + 1}</span>
                    <span className="server-detail-info__item-value">{gpuItem}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {temperatureItems.length > 0 ? (
        <div className="server-detail-info__group server-detail-info__group--temperature">
          <div className="server-detail-info__label">温度</div>
          <div className="server-detail-info__content">
            <div className="server-detail-info__items">
              {temperatureItems.map((item, idx) => (
                <span key={`${server.id}_temp_${idx}`} className="server-detail-info__item" title={item.title}>
                  <span className="server-detail-info__item-icon">
                    <i className={item.iconClass} />
                  </span>
                  <span className="server-detail-info__item-label" title={item.label}>
                    {item.label}
                  </span>
                  <span className="server-detail-info__item-value">{item.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="server-detail-info__group server-detail-info__group--system-os">
        <div className="server-detail-info__label">系统</div>
        <div className="server-detail-info__content">
          <span className="server-detail-info__item">
            <span className="server-detail-info__item-label">{systemLabel}</span>
            {platformVersion ? <span className="server-detail-info__item-value">{platformVersion}</span> : null}
          </span>
        </div>
      </div>

      <div className="server-detail-info__group server-detail-info__group--load">
        <div className="server-detail-info__label">占用</div>
        <div className="server-detail-info__content">
          <div className="server-detail-info__items">
            <span className="server-detail-info__item server-detail-info__item--process-count">
              <span className="server-detail-info__item-label">进程数</span>
              <span className="server-detail-info__item-value">{viewModel.processCount}</span>
            </span>
            <span className="server-detail-info__item server-detail-info__item--load">
              <span className="server-detail-info__item-label">负载</span>
              <span className="server-detail-info__item-value">{viewModel.loadText}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="server-detail-info__group server-detail-info__group--transfer">
        <div className="server-detail-info__label">流量</div>
        <div className="server-detail-info__content">
          <div className="server-detail-info__items">
            {viewModel.transferItems.map((item) => (
              <span
                key={item.key}
                className={`server-detail-info__item server-detail-info__item--transfer-${item.variant || item.key}${item.popover ? " server-detail-info__item--transfer-popover" : ""}`}
                title={item.popover ? undefined : item.title}
                role={item.popover ? "button" : undefined}
                tabIndex={item.popover ? 0 : undefined}
                onClick={
                  item.popover
                    ? () => setOpenTransferPopover((current) => (current === item.key ? null : item.key))
                    : undefined
                }
                onKeyDown={
                  item.popover
                    ? (event) => {
                        if (event.key !== "Enter" && event.key !== " ") return
                        event.preventDefault()
                        setOpenTransferPopover((current) => (current === item.key ? null : item.key))
                      }
                    : undefined
                }
              >
                <span className="server-detail-info__item-label">{item.label}</span>
                <span className="server-detail-info__item-value">
                  {item.variant === "in" || item.variant === "out" ? (
                    <span className="server-detail-info__transfer-value">{item.value}</span>
                  ) : (
                    item.value
                  )}
                </span>
                {item.popover && openTransferPopover === item.key ? (
                  <span className="server-detail-info__transfer-popover">{item.popover}</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="server-detail-info__group server-detail-info__group--conns">
        <div className="server-detail-info__label">连接</div>
        <div className="server-detail-info__content">
          <div className="server-detail-info__items">
            <span className="server-detail-info__item">
              <span className="server-detail-info__item-label">TCP</span>
              <span className="server-detail-info__item-value">{viewModel.tcpText}</span>
            </span>
            <span className="server-detail-info__item">
              <span className="server-detail-info__item-label">UDP</span>
              <span className="server-detail-info__item-value">{viewModel.udpText}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="server-detail-info__group server-detail-info__group--boot">
        <div className="server-detail-info__label">启动</div>
        <div className="server-detail-info__content">
          <span className="server-detail-info__item">
            <span className="server-detail-info__item-value">{bootTime}</span>
          </span>
        </div>
      </div>

      <div className="server-detail-info__group server-detail-info__group--active">
        <div className="server-detail-info__label">活跃</div>
        <div className="server-detail-info__content">
          <span className="server-detail-info__item">
            <span className="server-detail-info__item-value">{lastActive}</span>
          </span>
        </div>
      </div>

      {tagList.length > 0 ? (
        <div className="server-detail-info__group server-detail-info__group--tags">
          <div className="server-detail-info__label">标签</div>
          <div className="server-detail-info__content">
            <div className="server-detail-info__tags">
              {tagList.map((tag, idx) => (
                <span key={`${server.id}_tag_${idx}`} className="server-detail-info__tag">
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
