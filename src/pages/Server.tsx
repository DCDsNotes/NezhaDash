import SearchBox from "@/components/SearchBox"
import ServerCard from "@/components/ServerCard"
import { ServerListItemSkeleton } from "@/components/ServerListItemSkeleton"
import { ServerOptionBox, type ServerOptionItem } from "@/components/ServerOptionBox"
import { ServerSortBox } from "@/components/ServerSortBox"
import WorldMap, { buildLocationsFromServers } from "@/components/WorldMap"
import { type Status } from "@/context/status-context"
import { useNezhaWsData } from "@/hooks/use-nezha-ws-data"
import { useSort } from "@/hooks/use-sort"
import { useStatus } from "@/hooks/use-status"
import { useWorldMapSize } from "@/hooks/use-world-map-size"
import { serverGroupsQueryOptions } from "@/lib/query-options"
import { serverSortHandler, serverSortOptions } from "@/lib/server-sort"
import { getServerStatus, getServerStatusCounts } from "@/lib/server-view-model"
import { type ServerGroup } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

export default function Servers() {
  const { sortProp, sortOrder, setSortOrder, setSortProp } = useSort()
  const { data: groupData, isError: isGroupError } = useQuery(serverGroupsQueryOptions())
  const { data: nezhaWsData, lastMessage, connected } = useNezhaWsData()
  const { status, setStatus } = useStatus()
  const [currentGroup, setCurrentGroup] = useState("")
  const { width: worldMapWidth, height: worldMapHeight } = useWorldMapSize()

  useEffect(() => {
    const savedGroup = sessionStorage.getItem("selectedGroup") || ""
    setCurrentGroup(savedGroup === "All" ? "" : savedGroup)
  }, [])

  const groupOptions = useMemo<ServerOptionItem[]>(() => {
    const groups = groupData?.data
    const servers = nezhaWsData?.servers
    if (!Array.isArray(groups) || !Array.isArray(servers)) return []
    const existing = new Set(servers.map((server) => server.id))
    const result: ServerOptionItem[] = [{ key: "all", label: "全部分组", value: "", title: `${servers.length} 台` }]
    groups.forEach((item: ServerGroup) => {
      const count = Array.isArray(item.servers) ? item.servers.filter((id) => existing.has(id)).length : 0
      if (count > 0)
        result.push({ key: String(item.group.id || item.group.name), label: item.group.name, value: item.group.name, title: `${count} 台` })
    })
    return result
  }, [groupData?.data, nezhaWsData?.servers])

  const onlineOptions = useMemo<ServerOptionItem[]>(() => {
    if (!nezhaWsData?.servers) return []
    const counts = getServerStatusCounts(nezhaWsData.now, nezhaWsData.servers)
    return [
      { key: "all", label: "全部状态", value: "all", title: `${counts.total} 台` },
      { key: "online", label: "在线", value: "online", title: `${counts.online} 台` },
      { key: "offline", label: "离线", value: "offline", title: `${counts.offline} 台` },
    ]
  }, [nezhaWsData])

  const sortOptions = useMemo(() => serverSortOptions().map((item) => ({ value: item.value, label: item.label })), [])

  const filteredServers = useMemo(() => {
    if (!nezhaWsData?.servers) return []
    const next = nezhaWsData.servers.filter((server) => {
      if (!currentGroup) return true
      return !!groupData?.data?.some(
        (group: ServerGroup) => group.group.name === currentGroup && Array.isArray(group.servers) && group.servers.includes(server.id),
      )
    })
    const byStatus = status === "all" ? next : next.filter((server) => getServerStatus(nezhaWsData.now, server) === status)
    return [...byStatus].sort((a, b) => serverSortHandler(a, b, sortProp, sortOrder))
  }, [currentGroup, groupData?.data, nezhaWsData, sortOrder, sortProp, status])

  const counts = nezhaWsData ? getServerStatusCounts(nezhaWsData.now, filteredServers) : null
  const serverLocations = useMemo(
    () =>
      buildLocationsFromServers(
        filteredServers.map((server) => ({ ...server, online: getServerStatus(nezhaWsData?.now || 0, server) === "online" })),
      ),
    [filteredServers, nezhaWsData?.now],
  )

  function handleGroupChange(value: string) {
    setCurrentGroup(value)
    sessionStorage.setItem("selectedGroup", value)
  }

  if (!connected && !lastMessage) return <ServerPageSkeleton worldMapWidth={worldMapWidth} worldMapHeight={worldMapHeight} />
  if (!nezhaWsData) return <ServerPageSkeleton worldMapWidth={worldMapWidth} worldMapHeight={worldMapHeight} />

  return (
    <div className="server-page">
      <div className="dashboard-container">
        <section className="dashboard-page-heading">
          <div>
            <p className="dashboard-eyebrow">监控面板</p>
            <h1>服务器总览</h1>
            <p>集中查看节点状态、资源占用与网络活动。</p>
          </div>
          <div className="dashboard-overview-stats" aria-label="筛选结果统计">
            <div>
              <strong>{counts?.total ?? 0}</strong>
              <span>节点</span>
            </div>
            <div className="dashboard-overview-stats__online">
              <strong>{counts?.online ?? 0}</strong>
              <span>在线</span>
            </div>
            <div className="dashboard-overview-stats__offline">
              <strong>{counts?.offline ?? 0}</strong>
              <span>离线</span>
            </div>
          </div>
        </section>

        {serverLocations.length > 0 ? (
          <details className="dashboard-map-panel" aria-label="节点位置分布">
            <summary className="dashboard-section-heading">
              <div>
                <h2>节点位置</h2>
                <span>在线节点分布</span>
              </div>
              <i className="ri-arrow-down-s-line" aria-hidden="true" />
            </summary>
            <WorldMap locations={serverLocations} mapWidth={worldMapWidth} className="dashboard-map-panel__map" />
          </details>
        ) : null}

        <section className="dashboard-list-section">
          <div className="dashboard-toolbar">
            <div className="dashboard-toolbar__filters">
              <ServerOptionBox value={currentGroup} onChange={handleGroupChange} options={groupOptions} />
              {onlineOptions.length > 0 ? (
                <ServerOptionBox
                  value={status === "all" ? "all" : status}
                  onChange={(value) => setStatus((value || "all") as Status)}
                  options={onlineOptions}
                />
              ) : null}
              {isGroupError ? (
                <span className="dashboard-toolbar__error" role="status">
                  分组暂时不可用
                </span>
              ) : null}
            </div>
            <div className="dashboard-toolbar__actions">
              <SearchBox />
              <ServerSortBox
                value={{ prop: sortProp, order: sortOrder }}
                onChange={(value) => {
                  setSortProp(value.prop)
                  setSortOrder(value.order)
                }}
                options={sortOptions}
              />
            </div>
          </div>
          <div className="dashboard-list-heading">
            <div>
              <h2>全部服务器</h2>
              <span>按当前筛选显示 {filteredServers.length} 台</span>
            </div>
            <span className="dashboard-list-heading__hint">点击服务器查看详细监控</span>
          </div>
          <div className="server-card-grid">
            {filteredServers.length > 0 ? (
              filteredServers.map((serverInfo) => <ServerCard now={nezhaWsData.now} key={serverInfo.id} serverInfo={serverInfo} />)
            ) : (
              <div className="dashboard-empty dashboard-empty--panel">
                <i className="ri-server-line" aria-hidden="true" />
                <strong>当前筛选条件下没有服务器</strong>
                <span>尝试切换分组或在线状态。</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ServerPageSkeleton({ worldMapWidth, worldMapHeight }: { worldMapWidth: number; worldMapHeight: number }) {
  return (
    <div className="server-page">
      <div className="dashboard-container">
        <div className="dashboard-page-heading dashboard-skeleton-heading" />
        <div
          className="dashboard-map-panel dashboard-map-panel--skeleton"
          style={{ width: `${worldMapWidth}px`, minHeight: `${Math.min(worldMapHeight, 220)}px` }}
        />
        <div className="dashboard-toolbar dashboard-toolbar--skeleton" />
        <div className="server-card-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <ServerListItemSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  )
}
