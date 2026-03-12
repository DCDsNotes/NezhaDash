import DotBox from "@/components/nazhua/DotBox"
import ServerRealTime from "@/components/nazhua/ServerRealTime"
import ServerStatusDonut from "@/components/nazhua/ServerStatusDonut"
import ServerFlag from "@/components/ServerFlag"
import { formatNazhuaCpuMemDiskSummary, getNazhuaStatusList } from "@/lib/nazhua/server-status"
import { serverPath } from "@/lib/routes"
import { GetFontLogoClass, MageMicrosoftWindows } from "@/lib/logo-class"
import { cn, formatNezhaInfo } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"
import { useNavigate } from "react-router-dom"

export default function ServerCard({ now, serverInfo }: { now: number; serverInfo: NezhaServer }) {
  const navigate = useNavigate()
  const { name, country_code, online, platform } = formatNezhaInfo(now, serverInfo)

  const cardClick = () => {
    sessionStorage.setItem("fromMainPage", "true")
    navigate(serverPath(serverInfo.id))
  }

  const cpuMemDisk = formatNazhuaCpuMemDiskSummary(serverInfo)
  const statusList = getNazhuaStatusList({ server: serverInfo, tpl: ["cpu", "mem", "disk"], withContent: false })

  return (
    <DotBox className={cn("nazhua-server-list-item", { "nazhua-server-list-item--offline": !online })} padding={0} onClick={cardClick}>
      <div className="nazhua-server-info-group nazhua-server-list-item-head">
        <div className="nazhua-left-box">
          <div className="nazhua-server-flag">
            <ServerFlag country_code={country_code} />
          </div>
          <span className="nazhua-server-name">{name}</span>
        </div>
        <div className="nazhua-right-box">
          {cpuMemDisk ? (
            <div className="nazhua-cpu-mem-group">
              <span className="nazhua-system-os-icon">
                {platform.includes("Windows") ? <MageMicrosoftWindows className="nazhua-os-win" /> : <span className={`fl-${GetFontLogoClass(platform)}`} />}
              </span>
              <span className="nazhua-core-mem">{cpuMemDisk}</span>
            </div>
          ) : null}
        </div>
      </div>

      {online ? (
        <div className="nazhua-server-list-item-main">
          <div className="nazhua-server-list-item-status">
            {statusList.map((item) => (
              <ServerStatusDonut key={item.type} item={item} size={110} />
            ))}
          </div>
          <ServerRealTime server={serverInfo} />
        </div>
      ) : null}
    </DotBox>
  )
}
