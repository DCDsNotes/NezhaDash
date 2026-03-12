import { useStatus } from "@/hooks/use-status"
import { formatBytes } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowDownCircleIcon, ArrowUpCircleIcon } from "@heroicons/react/20/solid"
import { useTranslation } from "react-i18next"

type ServerOverviewProps = {
  online: number
  offline: number
  total: number
  up: number
  down: number
  upSpeed: number
  downSpeed: number
}

export default function ServerOverview({ online, offline, total, up, down, upSpeed, downSpeed }: ServerOverviewProps) {
  const { t } = useTranslation()
  const { status, setStatus } = useStatus()

  const customBackgroundImage = (window.CustomBackgroundImage as string) !== "" ? window.CustomBackgroundImage : undefined

  return (
    <>
      <Card
        className={cn("overflow-hidden", {
          "bg-card/70": customBackgroundImage,
        })}
      >
        <CardContent className="p-0">
          <section className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-3 md:px-6 nazhua-dot-bg bg-black/10 dark:bg-black/20">
            <section className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] md:text-[13px]">
              <button
                type="button"
                onClick={() => setStatus("all")}
                className={cn("flex items-center gap-1.5 text-white/80 hover:text-white transition-colors", {
                  "text-white": status === "all",
                })}
              >
                <span>{t("serverOverview.totalServers")}</span>
                <span className="font-bold text-[#70f3ff]">{total}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus("online")}
                className={cn("flex items-center gap-1.5 text-white/80 hover:text-white transition-colors", {
                  "text-white": status === "online",
                })}
              >
                <span>{t("serverOverview.onlineServers")}</span>
                <span className="font-bold text-[#00ff00]">{online}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus("offline")}
                className={cn("flex items-center gap-1.5 text-white/80 hover:text-white transition-colors", {
                  "text-white": status === "offline",
                })}
              >
                <span>{t("serverOverview.offlineServers")}</span>
                <span className="font-bold text-[#ff0000]">{offline}</span>
              </button>
            </section>

            <section className="flex flex-col sm:flex-row gap-x-6 gap-y-1 text-[12px] md:text-[13px] text-white/80">
              <section className="flex items-center gap-2">
                <span className="text-white/70">{t("serverOverview.totalBandwidth")}</span>
                <span className="flex items-center gap-1 text-[color:var(--transfer-out-color)] font-semibold">
                  <ArrowUpCircleIcon className="size-3" />
                  {formatBytes(up)}
                </span>
                <span className="flex items-center gap-1 text-[color:var(--transfer-in-color)] font-semibold">
                  <ArrowDownCircleIcon className="size-3" />
                  {formatBytes(down)}
                </span>
              </section>
              <section className="flex items-center gap-2">
                <span className="text-white/70">{t("serverOverview.speed")}</span>
                <span className="flex items-center gap-1 text-[color:var(--net-speed-out-color)] font-semibold">
                  <ArrowUpCircleIcon className="size-3" />
                  {formatBytes(upSpeed)}/s
                </span>
                <span className="flex items-center gap-1 text-[color:var(--net-speed-in-color)] font-semibold">
                  <ArrowDownCircleIcon className="size-3" />
                  {formatBytes(downSpeed)}/s
                </span>
              </section>
            </section>
          </section>
        </CardContent>
      </Card>
    </>
  )
}
