import { useAppTranslation } from "@/i18n"
import { completePageProgress } from "@/lib/page-progress"
import { useEffect } from "react"

interface ErrorPageProps {
  code?: string | number
}

export default function ErrorPage({ code = "500" }: ErrorPageProps) {
  const t = useAppTranslation()

  useEffect(() => completePageProgress(), [])

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-semibold">{code}</h1>
        <p className="text-xl text-muted-foreground">{t("error.somethingWentWrong")}</p>
      </div>
    </div>
  )
}
