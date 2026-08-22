import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { serverIdToServerKey } from "@/lib/server-key"
import { getServerSearchViewModel, matchServerSearchWord } from "@/lib/server-view-model"
import { type NezhaServer } from "@/types/nezha-api"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

function SearchListItem({ server, onOpenDetail }: { server: NezhaServer; onOpenDetail: (server: NezhaServer) => void }) {
  const tagList = useMemo(() => getServerSearchViewModel(server).tagList, [server])

  return (
    <button type="button" className="dashboard-search-result w-full text-left" onClick={() => onOpenDetail(server)}>
      <span className="dashboard-search-result__name">{server.name}</span>
      {tagList.length > 0 ? (
        <span className="dashboard-search-result__tags">
          {tagList.map((tag, index) => (
            <span key={`${server.id}_tag_${index}`} className="dashboard-search-result__tag">
              {tag}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  )
}

export default function SearchBox({ servers }: { servers: NezhaServer[] }) {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [searchWord, setSearchWord] = useState("")
  const deferredSearchWord = useDeferredValue(searchWord)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const searchResult = useMemo(
    () => (show ? servers.filter((server) => matchServerSearchWord(server, deferredSearchWord)) : []),
    [deferredSearchWord, servers, show],
  )

  function handleOpenChange(open: boolean) {
    if (open) setSearchWord("")
    setShow(open)
  }

  function openDetail(server: NezhaServer) {
    navigate(`/server/${serverIdToServerKey(server.id)}`)
    setShow(false)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return

      event.preventDefault()
      event.stopPropagation()
      setShow((current) => {
        if (!current) setSearchWord("")
        return !current
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (!servers.length) return null

  return (
    <Dialog open={show} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="dashboard-search-trigger" title="搜索节点 (Ctrl/Cmd+K)" aria-label="搜索服务器">
          <i className="ri-search-line" aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent className="dashboard-dialog dashboard-search-dialog" hideClose>
        <DialogTitle className="sr-only">搜索服务器</DialogTitle>
        <DialogDescription className="sr-only">按名称、标签、系统或国别代码筛选服务器。</DialogDescription>

        <div className="dashboard-search-dialog__input-row">
          <div className="dashboard-search-dialog__input-wrap">
            <label className="sr-only" htmlFor="server-search-input">
              搜索服务器
            </label>
            <input
              id="server-search-input"
              ref={inputRef}
              value={searchWord}
              type="search"
              placeholder="可搜索服务器名称、标签、系统、国别代码"
              className="dashboard-search-dialog__input"
              onChange={(event) => setSearchWord(event.target.value)}
            />
            {searchWord ? (
              <Button
                variant="ghost"
                size="icon"
                className="dashboard-search-dialog__clear"
                onClick={() => {
                  setSearchWord("")
                  inputRef.current?.focus()
                }}
                aria-label="清空搜索"
              >
                <i className="ri-close-fill" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="dashboard-search-dialog__close" aria-label="关闭搜索">
              <i className="ri-close-line" aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>

        <div className="dashboard-search-dialog__results-wrap">
          <div className="dashboard-search-dialog__results" aria-live="polite">
            {searchResult.length > 0 ? (
              searchResult.map((server) => <SearchListItem key={server.id} server={server} onOpenDetail={openDetail} />)
            ) : (
              <div className="dashboard-empty">未找到匹配的服务器</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
