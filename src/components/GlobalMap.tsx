import { serversToLocations } from "@/components/nazhua/WorldMap"
import DotBox from "@/components/nazhua/DotBox"
import WorldMap from "@/components/nazhua/WorldMap"
import { cn } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"

export default function GlobalMap({ serverList, now }: { serverList: NezhaServer[]; now: number }) {
  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined
  const locations = serversToLocations(serverList || [], now)

  if (serverList.length > 0 && locations.length === 0) return null

  return (
    <section className="mt-6 flex items-center justify-center">
      <DotBox
        padding={customBackgroundImage ? 16 : 0}
        className={cn("world-map-box", {
          "bg-card/70": customBackgroundImage,
        })}
      >
        <WorldMap locations={locations} width={900} />
      </DotBox>
    </section>
  )
}
