import { type Status } from "@/context/status-context"
import { useNezhaWsData } from "@/hooks/use-nezha-ws-data"
import { useSort } from "@/hooks/use-sort"
import { useStatus } from "@/hooks/use-status"
import { serverGroupsQueryOptions } from "@/lib/query-options"
import { serverSortHandler, serverSortOptions } from "@/lib/server-sort"
import { getServerHeaderStats, getServerStatus, getServerStatusCounts, matchServerSearchWord } from "@/lib/server-view-model"
import { type NezhaServer, type ServerGroup } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

export type WorkspaceGroup = {
  key: string
  label: string
  value: string
  count: number
}

export type ServerWorkspaceValue = {
  connected: boolean
  isLoading: boolean
  isGroupError: boolean
  now: number
  servers: NezhaServer[]
  filteredServers: NezhaServer[]
  currentGroup: string
  setCurrentGroup: (value: string) => void
  status: Status
  setStatus: (value: Status) => void
  searchWord: string
  setSearchWord: (value: string) => void
  sortProp: string
  sortOrder: "asc" | "desc"
  setSortProp: (value: string) => void
  setSortOrder: (value: "asc" | "desc") => void
  sortOptions: { value: string; label: string }[]
  groups: WorkspaceGroup[]
  totalCounts: ReturnType<typeof getServerStatusCounts>
  filteredCounts: ReturnType<typeof getServerStatusCounts>
  headerStats: ReturnType<typeof getServerHeaderStats>
}

export function useServerWorkspace(): ServerWorkspaceValue {
  const { sortProp, sortOrder, setSortOrder, setSortProp } = useSort()
  const { status, setStatus } = useStatus()
  const { data: groupData, isError: isGroupError } = useQuery(serverGroupsQueryOptions())
  const { data: wsData, connected } = useNezhaWsData()
  const [currentGroup, setCurrentGroupState] = useState("")
  const [searchWord, setSearchWord] = useState("")

  useEffect(() => {
    const savedGroup = sessionStorage.getItem("selectedGroup") || ""
    setCurrentGroupState(savedGroup === "All" ? "" : savedGroup)
  }, [])

  const now = wsData?.now || Date.now()
  const servers = useMemo(() => (Array.isArray(wsData?.servers) ? wsData.servers : []), [wsData?.servers])

  const groups = useMemo<WorkspaceGroup[]>(() => {
    const existingIds = new Set(servers.map((server) => server.id))
    const items: WorkspaceGroup[] = [{ key: "all", label: "全部节点", value: "", count: servers.length }]
    if (!Array.isArray(groupData?.data)) return items

    groupData.data.forEach((item: ServerGroup) => {
      const count = Array.isArray(item.servers) ? item.servers.filter((id) => existingIds.has(id)).length : 0
      if (count > 0) {
        items.push({
          key: String(item.group.id || item.group.name),
          label: item.group.name,
          value: item.group.name,
          count,
        })
      }
    })
    return items
  }, [groupData?.data, servers])

  const filteredServers = useMemo(() => {
    const byGroup = servers.filter((server) => {
      if (!currentGroup) return true
      return !!groupData?.data?.some(
        (group: ServerGroup) => group.group.name === currentGroup && Array.isArray(group.servers) && group.servers.includes(server.id),
      )
    })
    const byStatus = status === "all" ? byGroup : byGroup.filter((server) => getServerStatus(now, server) === status)
    const bySearch = searchWord.trim() ? byStatus.filter((server) => matchServerSearchWord(server, searchWord.trim())) : byStatus
    return [...bySearch].sort((a, b) => serverSortHandler(a, b, sortProp, sortOrder))
  }, [currentGroup, groupData?.data, now, searchWord, servers, sortOrder, sortProp, status])

  const totalCounts = useMemo(() => getServerStatusCounts(now, servers), [now, servers])
  const filteredCounts = useMemo(() => getServerStatusCounts(now, filteredServers), [filteredServers, now])
  const headerStats = useMemo(() => getServerHeaderStats(now, servers), [now, servers])
  const sortOptions = useMemo(() => serverSortOptions().map((item) => ({ value: item.value, label: item.label })), [])

  function setCurrentGroup(value: string) {
    setCurrentGroupState(value)
    sessionStorage.setItem("selectedGroup", value)
  }

  return {
    connected,
    isLoading: !wsData,
    isGroupError,
    now,
    servers,
    filteredServers,
    currentGroup,
    setCurrentGroup,
    status,
    setStatus,
    searchWord,
    setSearchWord,
    sortProp,
    sortOrder,
    setSortProp,
    setSortOrder,
    sortOptions,
    groups,
    totalCounts,
    filteredCounts,
    headerStats,
  }
}
