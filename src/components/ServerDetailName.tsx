import { useMemo } from "react"

import ServerFlag from "@/components/ServerFlag"
import { getServerDetailNameViewModel } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"

export default function ServerDetailName({ server }: { server: NezhaServer }) {
  const { cpuInfo, slogan } = useMemo(() => getServerDetailNameViewModel(server), [server])

  return (
    <div className="server-head nazha-box">
      <div className="server-flag-box">
        <ServerFlag country_code={server.country_code} />
      </div>
      <div className="server-name-and-slogan">
        <div className="server-name-group">
          <span className="server-name">{server.name}</span>
        </div>

        {slogan ? (
          <div className="slogan-content">
            <span>“{slogan}”</span>
          </div>
        ) : cpuInfo ? (
          <div className="cpu-model-info">
            {cpuInfo.company ? (
              <span className={cn("cpu-company", `cpu-company--${cpuInfo.company.toLowerCase()}`)}>{cpuInfo.company}</span>
            ) : null}
            {cpuInfo.model ? <span className="cpu-model">{cpuInfo.model}</span> : null}
            {cpuInfo.modelNum ? <span className="cpu-model-num">{cpuInfo.modelNum}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
