import { useAppTranslation } from "@/i18n"

interface ErrorPageProps {
  code?: string | number
}

export default function ErrorPage({ code = "500" }: ErrorPageProps) {
  const t = useAppTranslation()

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-semibold">{code}</h1>
        <p className="text-xl text-muted-foreground">{t("error.somethingWentWrong")}</p>
      </div>
    </div>
  )
}
