import ServerFlag from "@/components/ServerFlag"
import { getServerDetailNameViewModel } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"
import { useMemo } from "react"

export default function ServerDetailName({ server }: { server: NezhaServer }) {
  const { cpuInfo, slogan } = useMemo(() => getServerDetailNameViewModel(server), [server])

  return (
    <div className="server-detail-header nazha-box">
      <div className="server-detail-header__flag">
        <ServerFlag country_code={server.country_code} />
      </div>
      <div className="server-detail-header__content">
        <div className="server-detail-header__title-row">
          <span className="server-detail-header__name">{server.name}</span>
        </div>

        {slogan ? (
          <div className="server-detail-header__note">
            <span>“{slogan}”</span>
          </div>
        ) : cpuInfo ? (
          <div className="server-detail-header__cpu">
            {cpuInfo.company ? (
              <span className={cn("server-detail-header__cpu-brand", `server-detail-header__cpu-brand--${cpuInfo.company.toLowerCase()}`)}>
                {cpuInfo.company}
              </span>
            ) : null}
            {cpuInfo.model ? <span className="server-detail-header__cpu-model">{cpuInfo.model}</span> : null}
            {cpuInfo.modelNum ? <span className="server-detail-header__cpu-model-num">{cpuInfo.modelNum}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
