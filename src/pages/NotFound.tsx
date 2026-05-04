import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

export default function NotFound() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="flex  flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-semibold">404</h1>
        <p className="text-xl text-muted-foreground">{t("error.pageNotFound")}</p>
        <button
          className="mt-2 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          onClick={() => navigate("/")}
        >
          {t("error.backToHome")}
        </button>
      </div>
    </div>
  )
}
