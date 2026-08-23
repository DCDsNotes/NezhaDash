import WorldMap, { buildLocationsFromServers } from "@/components/WorldMap"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { type ServerWorkspaceValue } from "@/hooks/use-server-workspace"
import { useWorldMapSize } from "@/hooks/use-world-map-size"
import { getServerStatus } from "@/lib/server-view-model"
import { preloadWorldMapImage } from "@/lib/world-map"
import { useLayoutEffect, useMemo, useRef, useState } from "react"

export function preloadMapAssets() {
  return preloadWorldMapImage()
}

export default function MapDialog({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: ServerWorkspaceValue
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { width } = useWorldMapSize(open)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(0)
  useLayoutEffect(() => {
    if (!open || !canvasRef.current) return
    const canvas = canvasRef.current
    const updateWidth = () => setCanvasWidth(Math.floor(canvas.clientWidth))
    updateWidth()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateWidth)
    observer?.observe(canvas)
    return () => observer?.disconnect()
  }, [open])

  const desiredWidth = window.innerWidth > 900 ? Math.min(Math.max(width, 760), 800) : Math.min(width, window.innerWidth - 56)
  const mapWidth = canvasWidth > 0 ? Math.min(desiredWidth, canvasWidth) : desiredWidth
  const locations = useMemo(
    () =>
      open
        ? buildLocationsFromServers(
            workspace.filteredServers.map((server) => ({ ...server, online: getServerStatus(workspace.now, server) === "online" })),
          )
        : [],
    [open, workspace.filteredServers, workspace.now],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dashboard-dialog probe-map-dialog">
        <DialogTitle className="dashboard-dialog__title">节点地图</DialogTitle>
        <DialogDescription className="dashboard-dialog__description">当前筛选中的在线节点分布</DialogDescription>
        <div ref={canvasRef} className="probe-map-dialog__canvas">
          {locations.length > 0 ? <WorldMap locations={locations} mapWidth={mapWidth} /> : <div className="dashboard-empty">暂无在线节点位置</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
