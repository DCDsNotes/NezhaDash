import ServerCard from "@/components/ServerCard"
import { ServerListItemSkeleton } from "@/components/ServerListItemSkeleton"
import { ServerOptionBox, type ServerOptionItem } from "@/components/ServerOptionBox"
import { ServerSortBox } from "@/components/ServerSortBox"
import WorldMap, { buildLocationsFromServers } from "@/components/WorldMap"
import { useNezhaWsData } from "@/hooks/use-nezha-ws-data"
import { useSort } from "@/hooks/use-sort"
import { useStatus } from "@/hooks/use-status"
import { useWorldMapSize } from "@/hooks/use-world-map-size"
import { fetchServerGroup } from "@/lib/nezha-api"
import { serverSortHandler, serverSortOptions } from "@/lib/server-sort"
import { getServerMapLocationViewModel, getServerStatus, getServerStatusCounts } from "@/lib/server-view-model"
import { ServerGroup } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

export default function Servers() {
  const { sortProp, sortOrder, setSortOrder, setSortProp } = useSort()
  const { data: groupData } = useQuery({
    queryKey: ["server-group"],
    queryFn: () => fetchServerGroup(),
  })
  const { data: nezhaWsData, lastMessage, connected } = useNezhaWsData()
  const { status, setStatus } = useStatus()
  const [currentGroup, setCurrentGroup] = useState<string>("")
  const { width: worldMapWidth, height: worldMapHeight } = useWorldMapSize()

  const handleTagChange = (newGroup: string) => {
    setCurrentGroup(newGroup)
    sessionStorage.setItem("selectedGroup", newGroup)
    sessionStorage.setItem("scrollPosition", String(window.scrollY || 0))
  }

  useEffect(() => {
    const savedGroup = sessionStorage.getItem("selectedGroup") || ""
    setCurrentGroup(savedGroup === "All" ? "" : savedGroup)
    const savedPosition = sessionStorage.getItem("scrollPosition")
    if (savedPosition) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number(savedPosition), left: 0, behavior: "auto" })
      })
    }
  }, [])

  const groupOptions = useMemo(() => {
    const opts: ServerOptionItem[] = []
    const groups = groupData?.data
    const servers = nezhaWsData?.servers
    if (!Array.isArray(groups) || !Array.isArray(servers)) return opts

    const exist = new Set<number>(servers.map((s) => s.id))
    groups.forEach((item: ServerGroup) => {
      const ids = Array.isArray(item.servers) ? item.servers : []
      const count = ids.reduce((acc, id) => (exist.has(id) ? acc + 1 : acc), 0)
      if (count <= 0) return
      opts.push({
        key: String(item.group.id || item.group.name),
        label: item.group.name,
        value: item.group.name,
        title: `${count}台`,
      })
    })
    return opts
  }, [groupData?.data, nezhaWsData?.servers])

  const onlineOptions = useMemo<ServerOptionItem[]>(() => {
    const ws = nezhaWsData
    if (!ws || !Array.isArray(ws.servers)) return []
    const { offline, online, total } = getServerStatusCounts(ws.now, ws.servers)
    if (total !== online) {
      return [
        { key: "online", label: "在线", value: "online", title: `${online}台` },
        { key: "offline", label: "离线", value: "offline", title: `${offline}台` },
      ]
    }
    return []
  }, [nezhaWsData?.now, nezhaWsData?.servers])

  const sortOptions = useMemo(() => serverSortOptions().map((i) => ({ value: i.value, label: i.label })), [])

  if (!connected && !lastMessage) {
    return (
      <div className="server-page">
        <div className="server-page__scroll">
          <div className="world-map-box top-world-map">
            <div
              className="world-map-skeleton"
              style={{
                width: `${worldMapWidth}px`,
                height: `${worldMapHeight}px`,
              }}
            />
          </div>
          <div className="server-toolbar">
            <div className="server-toolbar__groups" />
            <div className="server-toolbar__actions" />
          </div>
          <div className="server-card-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServerListItemSkeleton key={`skeleton_${i}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!nezhaWsData) {
    return (
      <div className="server-page">
        <div className="server-page__scroll">
          <div className="world-map-box top-world-map">
            <div
              className="world-map-skeleton"
              style={{
                width: `${worldMapWidth}px`,
                height: `${worldMapHeight}px`,
              }}
            />
          </div>
          <div className="server-toolbar">
            <div className="server-toolbar__groups" />
            <div className="server-toolbar__actions" />
          </div>
          <div className="server-card-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <ServerListItemSkeleton key={`skeleton_${i}`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  let filteredServers =
    nezhaWsData?.servers?.filter((server) => {
      if (!currentGroup) return true
      const group = groupData?.data?.find(
        (g: ServerGroup) => g.group.name === currentGroup && Array.isArray(g.servers) && g.servers.includes(server.id),
      )
      return !!group
    }) || []

  filteredServers =
    status === "all" ? filteredServers : filteredServers.filter((server) => [status].includes(getServerStatus(nezhaWsData.now, server)))

  filteredServers = filteredServers.sort((a, b) => serverSortHandler(a, b, sortProp, sortOrder))

  const serverLocations = buildLocationsFromServers(filteredServers.map((server) => getServerMapLocationViewModel(nezhaWsData.now, server)))
  const showWorldMap = !(filteredServers.length > 0 && serverLocations.length === 0)

  return (
    <div className="server-page">
      <div className="server-page__scroll">
        <div className="world-map-box top-world-map">
          {showWorldMap ? (
            <WorldMap locations={serverLocations} mapWidth={worldMapWidth} />
          ) : (
            <div
              className="world-map-skeleton"
              style={{
                width: `${worldMapWidth}px`,
                height: `${worldMapHeight}px`,
              }}
            />
          )}
        </div>
        <div className="server-toolbar">
          <div className="server-toolbar__groups">
            {groupOptions.length > 0 && <ServerOptionBox value={currentGroup} onChange={handleTagChange} options={groupOptions} />}
          </div>
          <div className="server-toolbar__actions">
            {onlineOptions.length > 0 && (
              <ServerOptionBox value={status === "all" ? "" : status} onChange={(val) => setStatus((val || "all") as any)} options={onlineOptions} />
            )}
            <ServerSortBox
              value={{ prop: sortProp, order: sortOrder }}
              onChange={(val) => {
                setSortProp(val.prop)
                setSortOrder(val.order)
              }}
              options={sortOptions}
            />
          </div>
        </div>
        <div className="server-card-grid">
          {filteredServers.map((serverInfo) => (
            <ServerCard now={nezhaWsData.now} key={serverInfo.id} serverInfo={serverInfo} />
          ))}
        </div>
      </div>
    </div>
  )
}
