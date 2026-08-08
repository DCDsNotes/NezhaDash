import { useNezhaWsData } from "@/hooks/use-nezha-ws-data"
import { serverGroupsQueryOptions } from "@/lib/query-options"
import { serverSortOptions, sortServers } from "@/lib/server-sort"
import { getServerOverviewStats, getServerStatus, matchServerSearchWord } from "@/lib/server-view-model"
import { type NezhaServer, type ServerGroup } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"

export type WorkspaceGroup = {
  key: string
  label: string
  value: string
  count: number
}

export type Status = "all" | "online" | "offline"

export type ServerWorkspaceValue = {
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
  totalCounts: ReturnType<typeof getServerOverviewStats>["totalCounts"]
  headerStats: ReturnType<typeof getServerOverviewStats>["headerStats"]
}

const WORKSPACE_SORT_OPTIONS = serverSortOptions().map(({ value, label }) => ({ value, label }))

function getInitialGroup() {
  try {
    const savedGroup = sessionStorage.getItem("selectedGroup") || ""
    return savedGroup === "All" ? "" : savedGroup
  } catch {
    return ""
  }
}

export function useServerWorkspace(): ServerWorkspaceValue {
  const { data: groupData, isError: isGroupError } = useQuery(serverGroupsQueryOptions())
  const { data: wsData } = useNezhaWsData()
  const [status, setStatus] = useState<Status>("all")
  const [sortProp, setSortProp] = useState("DisplayIndex")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentGroup, setCurrentGroupState] = useState(getInitialGroup)
  const [searchWord, setSearchWord] = useState("")

  const now = wsData?.now || Date.now()
  const servers = Array.isArray(wsData?.servers) ? wsData.servers : []

  const groupServerIds = useMemo(() => {
    const result = new Map<string, Set<number>>()
    if (!Array.isArray(groupData?.data)) return result
    groupData.data.forEach((item: ServerGroup) => result.set(item.group.name, new Set(Array.isArray(item.servers) ? item.servers : [])))
    return result
  }, [groupData?.data])

  const groups = useMemo<WorkspaceGroup[]>(() => {
    const existingIds = new Set(servers.map((server) => server.id))
    const items: WorkspaceGroup[] = [{ key: "all", label: "全部节点", value: "", count: servers.length }]
    if (!Array.isArray(groupData?.data)) return items

    groupData.data.forEach((item: ServerGroup) => {
      const serverIds = groupServerIds.get(item.group.name)
      const count = serverIds ? Array.from(serverIds).reduce((sum, id) => sum + Number(existingIds.has(id)), 0) : 0
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
  }, [groupData?.data, groupServerIds, servers])

  const filteredServers = useMemo(() => {
    const selectedGroupIds = currentGroup ? groupServerIds.get(currentGroup) : null
    const byGroup = selectedGroupIds ? servers.filter((server) => selectedGroupIds.has(server.id)) : currentGroup ? [] : servers
    const byStatus = status === "all" ? byGroup : byGroup.filter((server) => getServerStatus(now, server) === status)
    const normalizedSearch = searchWord.trim()
    const bySearch = normalizedSearch ? byStatus.filter((server) => matchServerSearchWord(server, normalizedSearch)) : byStatus
    return sortServers(bySearch, sortProp, sortOrder)
  }, [currentGroup, groupServerIds, now, searchWord, servers, sortOrder, sortProp, status])

  const { totalCounts, headerStats } = useMemo(() => getServerOverviewStats(now, servers), [now, servers])

  const setCurrentGroup = useCallback((value: string) => {
    setCurrentGroupState(value)
    try {
      sessionStorage.setItem("selectedGroup", value)
    } catch {
      // Keep the current selection in memory when storage is unavailable.
    }
  }, [])

  return useMemo(
    () => ({
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
      sortOptions: WORKSPACE_SORT_OPTIONS,
      groups,
      totalCounts,
      headerStats,
    }),
    [
      currentGroup,
      filteredServers,
      groups,
      headerStats,
      isGroupError,
      now,
      searchWord,
      servers,
      setCurrentGroup,
      sortOrder,
      sortProp,
      status,
      totalCounts,
      wsData,
    ],
  )
}
