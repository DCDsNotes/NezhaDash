import { Button } from "@/components/ui/button"
import { useAppTranslation } from "@/i18n"
import { useNavigate } from "react-router-dom"

export default function NotFound() {
  const navigate = useNavigate()
  const t = useAppTranslation()

  return (
    <div className="flex  flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-semibold">404</h1>
        <p className="text-xl text-muted-foreground">{t("error.pageNotFound")}</p>
        <Button className="mt-2" onClick={() => navigate("/")}>
          {t("error.backToHome")}
        </Button>
      </div>
    </div>
  )
}
