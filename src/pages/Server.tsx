import WorldMap from "@/components/WorldMap"
import { type ServerWorkspaceValue } from "@/hooks/use-server-workspace"
import { getServerCardViewModel, getServerStatus } from "@/lib/server-view-model"
import { useEffect, useMemo, useRef, useState } from "react"
import { useOutletContext } from "react-router-dom"

type ResourceSummary = {
  type: string
  label: string
  value: number
}

function usePanelWidth() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(720)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry.contentRect.width)
      if (next > 0) setWidth(next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

function getResourceSummaries(workspace: ServerWorkspaceValue): ResourceSummary[] {
  const onlineServers = workspace.filteredServers.filter((server) => getServerStatus(workspace.now, server) === "online")
  const resources = [
    { type: "cpu", label: "CPU" },
    { type: "mem", label: "内存" },
    { type: "disk", label: "磁盘" },
  ]

  return resources.map((resource) => {
    const values = onlineServers
      .map((server) => getServerCardViewModel(workspace.now, server).rings.find((ring) => ring.type === resource.type)?.used)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    const average = values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0
    return { ...resource, value: Number(average.toFixed(1)) }
  })
}

export default function Servers() {
  const workspace = useOutletContext<ServerWorkspaceValue>()
  const { ref: mapPanelRef, width: mapPanelWidth } = usePanelWidth()
  const availability = workspace.totalCounts.total > 0 ? (workspace.totalCounts.online / workspace.totalCounts.total) * 100 : 0
  const resourceSummaries = useMemo(() => getResourceSummaries(workspace), [workspace])
  const mapWidth = Math.max(320, Math.min(820, mapPanelWidth - 48))

  return (
    <div className="probe-overview">
      <header className="probe-main-header">
        <div>
          <h1>节点概览</h1>
          <p>查看当前节点状态、资源占用和区域分布</p>
        </div>
        <div className="probe-main-header__network" aria-label="当前网络速度">
          <span>
            <i className="ri-arrow-down-line" aria-hidden="true" />
            {workspace.headerStats.netSpeed.inData.value}
            {workspace.headerStats.netSpeed.inData.unit}/s
          </span>
          <span>
            <i className="ri-arrow-up-line" aria-hidden="true" />
            {workspace.headerStats.netSpeed.outData.value}
            {workspace.headerStats.netSpeed.outData.unit}/s
          </span>
        </div>
      </header>

      <div className="probe-overview__body">
        <section className="probe-summary-strip" aria-label="节点汇总">
          <div>
            <span>全部节点</span>
            <strong>{workspace.totalCounts.total}</strong>
          </div>
          <div>
            <span>在线</span>
            <strong className="probe-text-online">{workspace.totalCounts.online}</strong>
          </div>
          <div>
            <span>离线</span>
            <strong className="probe-text-offline">{workspace.totalCounts.offline}</strong>
          </div>
          <div>
            <span>在线率</span>
            <strong>{availability.toFixed(1)}%</strong>
          </div>
        </section>

        <section className="probe-overview-panel probe-overview-map" ref={mapPanelRef}>
          <div className="probe-overview-panel__header">
            <div>
              <h2>节点分布</h2>
              <span>当前筛选中的在线节点</span>
            </div>
            <span className="probe-overview-panel__count">{workspace.locations.length} 个区域</span>
          </div>
          <div className="probe-overview-map__canvas">
            {workspace.locations.length > 0 ? (
              <WorldMap locations={workspace.locations} mapWidth={mapWidth} />
            ) : (
              <div className="probe-overview-empty">
                <i className="ri-map-pin-line" aria-hidden="true" />
                <span>当前没有可显示的位置</span>
              </div>
            )}
          </div>
        </section>

        <section className="probe-overview-panel probe-resource-overview">
          <div className="probe-overview-panel__header">
            <div>
              <h2>资源概览</h2>
              <span>在线节点的平均使用率</span>
            </div>
            <span className="probe-overview-panel__count">{workspace.filteredCounts.online} 台在线</span>
          </div>
          <div className="probe-resource-overview__rows">
            {resourceSummaries.map((resource) => (
              <div key={resource.type} className="probe-resource-row">
                <span>{resource.label}</span>
                <div className="probe-resource-row__bar" aria-hidden="true">
                  <span style={{ width: `${resource.value}%` }} />
                </div>
                <strong>{resource.value}%</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
