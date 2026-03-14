import ServerCard from "@/components/ServerCard"
import { ServerListItemSkeleton } from "@/components/ServerListItemSkeleton"
import { ServerOptionBox } from "@/components/ServerOptionBox"
import { ServerSortBox } from "@/components/ServerSortBox"
import WorldMap, { buildLocationsFromServers } from "@/components/WorldMap"
import { SORT_TYPES } from "@/context/sort-context"
import { useSort } from "@/hooks/use-sort"
import { useStatus } from "@/hooks/use-status"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { fetchServerGroup } from "@/lib/nezha-api"
import { formatNezhaInfo } from "@/lib/utils"
import { NezhaWebsocketResponse } from "@/types/nezha-api"
import { ServerGroup } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

function computeDetailContainerWidth() {
  const w = window.innerWidth
  if (w <= 720) return w
  if (w <= 800) return 720
  if (w <= 1024) return 800
  return 900
}

function computeWorldMapWidth() {
  return Math.max(computeDetailContainerWidth() - 40, 300)
}

export default function Servers() {
  const { sortType, sortOrder, setSortOrder, setSortType } = useSort()
  const { data: groupData } = useQuery({
    queryKey: ["server-group"],
    queryFn: () => fetchServerGroup(),
  })
  const { lastMessage, connected } = useWebSocketContext()
  const { status, setStatus } = useStatus()
  const [currentGroup, setCurrentGroup] = useState<string>("All")
  const [worldMapWidth, setWorldMapWidth] = useState<number>(() => (typeof window === "undefined" ? 900 : computeWorldMapWidth()))
  const worldMapHeight = useMemo(() => Math.ceil((621 / 1280) * (Number(worldMapWidth) || 0)), [worldMapWidth])

  const handleTagChange = (newGroup: string) => {
    setCurrentGroup(newGroup)
    sessionStorage.setItem("selectedGroup", newGroup)
    sessionStorage.setItem("scrollPosition", String(window.scrollY || 0))
  }

  useEffect(() => {
    const savedGroup = sessionStorage.getItem("selectedGroup") || "All"
    setCurrentGroup(savedGroup)
    const savedPosition = sessionStorage.getItem("scrollPosition")
    if (savedPosition) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number(savedPosition), left: 0, behavior: "auto" })
      })
    }
  }, [])

  useEffect(() => {
    const handleResize = () => setWorldMapWidth(computeWorldMapWidth())
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const nezhaWsData = lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null

  const groupOptions = useMemo(() => {
    const opts = [{ key: "All", label: "全部", value: "All" }]
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

  const onlineOptions = useMemo(() => {
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
    () =>
      SORT_TYPES.map((type) => {
        const label =
          type === "default"
            ? "排序值"
            : type === "name"
              ? "名称"
              : type === "uptime"
                ? "在线时长"
                : type === "system"
                  ? "系统"
                  : type === "cpu"
                    ? "CPU"
                    : type === "mem"
                      ? "内存"
                      : type === "disk"
                        ? "硬盘"
                        : type === "up"
                          ? "上传"
                          : type === "down"
                            ? "下载"
                            : type === "up total"
                              ? "总上传"
                              : type === "down total"
                                ? "总下载"
                                : String(type)
        return { value: type, label }
      }),
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
      if (currentGroup === "All") return true
      const group = groupData?.data?.find(
        (g: ServerGroup) => g.group.name === currentGroup && Array.isArray(g.servers) && g.servers.includes(server.id),
      )
      return !!group
    }) || []

  filteredServers =
    status === "all"
      ? filteredServers
      : filteredServers.filter((server) => [status].includes(formatNezhaInfo(nezhaWsData.now, server).online ? "online" : "offline"))

  filteredServers = filteredServers.sort((a, b) => {
    const serverAInfo = formatNezhaInfo(nezhaWsData.now, a)
    const serverBInfo = formatNezhaInfo(nezhaWsData.now, b)

    if (sortType !== "name") {
      // 仅在非 "name" 排序时，先按在线状态排序
      if (!serverAInfo.online && serverBInfo.online) return 1
      if (serverAInfo.online && !serverBInfo.online) return -1
      if (!serverAInfo.online && !serverBInfo.online) {
        // 如果两者都离线，可以继续按照其他条件排序，或者保持原序
        // 这里选择保持原序
        return 0
      }
    }

    let comparison = 0

    switch (sortType) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "uptime":
        comparison = (a.state?.uptime ?? 0) - (b.state?.uptime ?? 0)
        break
      case "system":
        comparison = a.host.platform.localeCompare(b.host.platform)
        break
      case "cpu":
        comparison = (a.state?.cpu ?? 0) - (b.state?.cpu ?? 0)
        break
      case "mem":
        comparison = (formatNezhaInfo(nezhaWsData.now, a).mem ?? 0) - (formatNezhaInfo(nezhaWsData.now, b).mem ?? 0)
        break
      case "disk":
        comparison = (formatNezhaInfo(nezhaWsData.now, a).disk ?? 0) - (formatNezhaInfo(nezhaWsData.now, b).disk ?? 0)
        break
      case "up":
        comparison = (a.state?.net_out_speed ?? 0) - (b.state?.net_out_speed ?? 0)
        break
      case "down":
        comparison = (a.state?.net_in_speed ?? 0) - (b.state?.net_in_speed ?? 0)
        break
      case "up total":
        comparison = (a.state?.net_out_transfer ?? 0) - (b.state?.net_out_transfer ?? 0)
        break
      case "down total":
        comparison = (a.state?.net_in_transfer ?? 0) - (b.state?.net_in_transfer ?? 0)
        break
      default:
        comparison = 0
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

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
            {groupOptions.length > 1 && (
              <ServerOptionBox value={currentGroup} onChange={handleTagChange} options={groupOptions} acceptEmpty={false} />
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
              value={{ prop: sortType === "default" ? "" : sortType, order: sortOrder }}
              onChange={(val) => {
                setSortType(((val.prop || "default") as any) || "default")
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
