import { useEffect, useMemo, useRef, useState } from "react"

import { useNavigate } from "react-router-dom"

import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { serverIdToServerKey } from "@/lib/server-key"
import { parsePublicNote } from "@/lib/utils"
import { type NezhaServer, type NezhaWebsocketResponse } from "@/types/nezha-api"

function buildTagList(server: NezhaServer) {
  const note = parsePublicNote(server.public_note || "")
  const plan = note?.planDataMod
  const list: string[] = []
  if (plan?.networkRoute) list.push(...String(plan.networkRoute).split(",").filter(Boolean))
  if (plan?.extra) list.push(...String(plan.extra).split(",").filter(Boolean))
  return list.slice(0, 3)
}

function matchServer(server: NezhaServer, word: string) {
  const w = word.toLowerCase()
  if (String(server.name || "").toLowerCase().includes(w)) return true

  const note = parsePublicNote(server.public_note || "")
  const plan = note?.planDataMod

  const networkRoute = String(plan?.networkRoute || "").toLowerCase()
  const extra = String(plan?.extra || "").toLowerCase()
  const platform = String(server.host?.platform || "").toLowerCase()
  const countryCode = String(server.country_code || "").toLowerCase()

  return [networkRoute, extra, platform, countryCode].some((s) => s.includes(w))
}

function SearchListItem({ server, onOpenDetail }: { server: NezhaServer; onOpenDetail: (s: NezhaServer) => void }) {
  const tagList = useMemo(() => buildTagList(server), [server])
  return (
    <div className="search-list-item" onClick={() => onOpenDetail(server)}>
      <div className="server-name">{server.name}</div>
      {tagList.length > 0 ? (
        <div className="server-tag-list">
          {tagList.map((tag, idx) => (
            <span key={`${server.id}_tag_${idx}`} className="tag-item">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function SearchBox() {
  const navigate = useNavigate()
  const { lastMessage, connected } = useWebSocketContext()

  const nezhaWsData = connected && lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null
  const serverList = useMemo(() => (nezhaWsData?.servers && Array.isArray(nezhaWsData.servers) ? nezhaWsData.servers : []), [nezhaWsData?.servers])

  const [show, setShow] = useState(false)
  const [searchWord, setSearchWord] = useState("")
  const [searchResult, setSearchResult] = useState<NezhaServer[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const searchTimer = useRef<number | null>(null)

  function openSearch() {
    setSearchWord("")
    setSearchResult([...serverList])
    setShow(true)
    document.body.style.overflow = "hidden"
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }

  function closeSearch() {
    setShow(false)
    document.body.style.overflow = ""
  }

  function clearSearchWord() {
    setSearchWord("")
    setSearchResult([...serverList])
  }

  function handleSearch(word: string) {
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    if (!word) {
      setSearchResult([...serverList])
      return
    }
    searchTimer.current = window.setTimeout(() => {
      searchTimer.current = null
      const list = serverList.filter((s) => matchServer(s, word))
      setSearchResult(list)
    }, 200)
  }

  function onOpenDetail(server: NezhaServer) {
    navigate(`/server/${serverIdToServerKey(server.id)}`)
    closeSearch()
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.stopPropagation()
        event.preventDefault()
        if (show) closeSearch()
        else openSearch()
      }
    }

    function handleEscKey(event: KeyboardEvent) {
      if (!show) return
      if (event.key === "Escape") {
        event.stopPropagation()
        event.preventDefault()
        closeSearch()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keydown", handleEscKey)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keydown", handleEscKey)
    }
  }, [show, serverList])

  useEffect(() => {
    if (!show) return
    handleSearch(searchWord)
  }, [searchWord])

  useEffect(() => {
    if (!show) return
    setSearchResult([...serverList])
  }, [serverList, show])

  useEffect(
    () => () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current)
      document.body.style.overflow = ""
    },
    [],
  )

  if (!serverList.length) {
    return null
  }

  return (
    <>
      {show ? <div className="search-box-background" onClick={closeSearch} /> : null}
      {show ? (
        <div className="search-box-group">
          <div className="search-box">
            <input
              ref={inputRef}
              value={searchWord}
              type="text"
              placeholder="可搜索服务器名称、标签、系统、国别代码"
              className="search-box-input"
              onChange={(e) => setSearchWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch(searchWord)
              }}
              onBlur={() => handleSearch(searchWord)}
            />
            {searchWord ? (
              <span className="clear-btn" onClick={clearSearchWord}>
                <i className="clear-icon ri-close-fill" />
              </span>
            ) : null}
          </div>
          <div className="result-server-list-container">
            <div className="search-list">
              {searchResult.map((item) => (
                <SearchListItem key={item.id} server={item} onOpenDetail={onOpenDetail} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="search-active-btn" onClick={openSearch} title="搜索 (Ctrl/Cmd+K)">
        <span className="icon">
          <i className="ri-search-line" />
        </span>
      </div>
    </>
  )
}

