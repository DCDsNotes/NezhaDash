import { useMemo } from "react"

import ServerFlag from "@/components/ServerFlag"
import { cn, formatBillingEndDate, handlePublicNote, parsePublicNote } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"

type CpuInfo = {
  company: string
  model: string
  modelNum: string
}

function parseCpuInfo(text: string): CpuInfo | null {
  const t = String(text || "")
  if (!t) return null

  const companyMatch = t.match(/Intel|AMD|ARM|Qualcomm|Apple|Samsung|IBM|NVIDIA/i)
  const modelMatch = t.match(/Xeon|Threadripper|Athlon|Pentium|Celeron|Opteron|Phenom|Turion|Sempron|FX|A-Series|R-Series|EPYC|Ryzen/i)

  let modelNum = ""
  const ryzen = t.match(/Ryzen.*?(\d{3,4}(?:[A-Z]{0,2})?)/i)
  if (ryzen?.[1]) modelNum = ryzen[1]
  const epyc = t.match(/EPYC\\s+(\\d[A-Z0-9]{2,4})/i)
  if (!modelNum && epyc?.[1]) modelNum = epyc[1]
  const xeon = t.match(/\\b(E\\d-\\d{4}(?:\\s?v\\d)?)\\b/i)
  if (!modelNum && xeon?.[1]) modelNum = xeon[1]
  const core = t.match(/\\b(i[3579]-\\d{4,5}\\w*)\\b/i)
  if (!modelNum && core?.[1]) modelNum = core[1]

  return {
    company: companyMatch ? companyMatch[0] : "",
    model: modelMatch ? modelMatch[0] : "",
    modelNum,
  }
}

export default function ServerDetailName({ server }: { server: NezhaServer }) {
  const cpuText = server.host?.cpu?.[0] || ""
  const cpuInfo = useMemo(() => parseCpuInfo(cpuText), [cpuText])
  const publicNote = useMemo(() => handlePublicNote(server.id, server.public_note || ""), [server.id, server.public_note])
  const parsedData = useMemo(() => parsePublicNote(publicNote), [publicNote])
  const endDateText = useMemo(() => formatBillingEndDate(parsedData?.billingDataMod?.endDate), [parsedData?.billingDataMod?.endDate])

  // custom slogan from PublicNote.customData.slogan (optional)
  const slogan = useMemo(() => {
    try {
      const raw = publicNote ? JSON.parse(publicNote) : null
      return raw?.customData?.slogan ? String(raw.customData.slogan) : ""
    } catch {
      return ""
    }
  }, [publicNote])

  return (
    <div className="server-head nazha-box">
      <div className="server-flag-box">
        <ServerFlag country_code={server.country_code} />
      </div>
      <div className="server-name-and-slogan">
        <div className="server-name-group">
          <span className="server-name">{server.name}</span>
          {endDateText ? (
            <span className="server-spec">
              <span className="server-spec-text">{endDateText}</span>
            </span>
          ) : null}
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
