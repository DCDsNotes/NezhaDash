import ServerCard from "@/components/ServerCard"
import { ServerListItemSkeleton } from "@/components/ServerListItemSkeleton"
import { ServerOptionBox, type ServerOptionItem } from "@/components/ServerOptionBox"
import { ServerSortBox } from "@/components/ServerSortBox"
import WorldMap, { buildLocationsFromServers } from "@/components/WorldMap"
import { useSort } from "@/hooks/use-sort"
import { useStatus } from "@/hooks/use-status"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { computeWorldMapWidth } from "@/lib/layout"
import { fetchServerGroup } from "@/lib/nezha-api"
import { serverSortHandler, serverSortOptions } from "@/lib/server-sort"
import { formatNezhaInfo } from "@/lib/utils"
import { NezhaWebsocketResponse } from "@/types/nezha-api"
import { ServerGroup } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

export default function Servers() {
  const { sortProp, sortOrder, setSortOrder, setSortProp } = useSort()
  const { data: groupData } = useQuery({
    queryKey: ["server-group"],
    queryFn: () => fetchServerGroup(),
  })
  const { lastMessage, connected } = useWebSocketContext()
  const { status, setStatus } = useStatus()
  const [currentGroup, setCurrentGroup] = useState<string>("")
  const [worldMapWidth, setWorldMapWidth] = useState<number>(() =>
    typeof window === "undefined" ? 900 : computeWorldMapWidth(window.innerWidth),
  )
  const worldMapHeight = useMemo(() => Math.ceil((621 / 1280) * (Number(worldMapWidth) || 0)), [worldMapWidth])

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

  useEffect(() => {
    const handleResize = () => setWorldMapWidth(computeWorldMapWidth(window.innerWidth))
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const nezhaWsData = lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null

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
    const total = ws.servers.length
    const online = ws.servers.reduce((acc, s) => (formatNezhaInfo(ws.now, s).online ? acc + 1 : acc), 0)
    const offline = Math.max(total - online, 0)
    if (total !== online) {
      return [
        { key: "online", label: "在线", value: "online", title: `${online}台` },
        { key: "offline", label: "离线", value: "offline", title: `${offline}台` },
      ]
    }
    return []
  }, [nezhaWsData?.now, nezhaWsData?.servers])

  const sortOptions = useMemo(
    () => serverSortOptions().map((i) => ({ value: i.value, label: i.label })),
    [],
  )

  if (!connected && !lastMessage) {
    return (
      <div className="index-container list-is--card">
        <div className="scroll-container">
          <div className="world-map-box top-world-map">
            <div
              className="world-map-skeleton"
              style={{
                width: `${worldMapWidth}px`,
                height: `${worldMapHeight}px`,
              }}
            />
          </div>
          <div className="filter-group">
            <div className="left-box" />
            <div className="right-box" />
          </div>
          <div className="server-list-container server-list--card">
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
      <div className="index-container list-is--card">
        <div className="scroll-container">
          <div className="world-map-box top-world-map">
            <div
              className="world-map-skeleton"
              style={{
                width: `${worldMapWidth}px`,
                height: `${worldMapHeight}px`,
              }}
            />
          </div>
          <div className="filter-group">
            <div className="left-box" />
            <div className="right-box" />
          </div>
          <div className="server-list-container server-list--card">
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
    status === "all"
      ? filteredServers
      : filteredServers.filter((server) => [status].includes(formatNezhaInfo(nezhaWsData.now, server).online ? "online" : "offline"))

  filteredServers = filteredServers.sort((a, b) => serverSortHandler(a, b, sortProp, sortOrder))

  const serverLocations = buildLocationsFromServers(
    filteredServers.map((s) => ({
      id: s.id,
      name: s.name,
      country_code: s.country_code,
      online: formatNezhaInfo(nezhaWsData.now, s).online,
    })),
  )
  const showWorldMap = !(filteredServers.length > 0 && serverLocations.length === 0)

  return (
    <div className="index-container list-is--card">
      <div className="scroll-container">
        <div className="world-map-box top-world-map">
          {showWorldMap ? (
            <WorldMap locations={serverLocations} />
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
        <div className="filter-group">
          <div className="left-box">
            {groupOptions.length > 0 && (
              <ServerOptionBox value={currentGroup} onChange={handleTagChange} options={groupOptions} />
            )}
          </div>
          <div className="right-box">
            {onlineOptions.length > 0 && (
              <ServerOptionBox
                value={status === "all" ? "" : status}
                onChange={(val) => setStatus((val || "all") as any)}
                options={onlineOptions}
              />
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
        <div className="server-list-container server-list--card">
          {filteredServers.map((serverInfo) => (
            <ServerCard now={nezhaWsData.now} key={serverInfo.id} serverInfo={serverInfo} />
          ))}
        </div>
      </div>
    </div>
  )
}
