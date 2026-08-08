import WorldMap, { buildLocationsFromServers } from "@/components/WorldMap"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { type ServerWorkspaceValue } from "@/hooks/use-server-workspace"
import { useWorldMapSize } from "@/hooks/use-world-map-size"
import { getServerStatus } from "@/lib/server-view-model"
import { preloadWorldMapImage } from "@/lib/world-map"
import { useMemo } from "react"

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
  const mapWidth = window.innerWidth > 900 ? Math.min(Math.max(width, 760), 900) : width
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
        <div className="probe-map-dialog__canvas">
          {locations.length > 0 ? <WorldMap locations={locations} mapWidth={mapWidth} /> : <div className="dashboard-empty">暂无在线节点位置</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
