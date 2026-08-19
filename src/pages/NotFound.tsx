import { Button } from "@/components/ui/button"
import { useAppTranslation } from "@/i18n"
import "@/styles/not-found.css"
import { Link, useLocation } from "react-router-dom"

export default function NotFound() {
  const location = useLocation()
  const t = useAppTranslation()

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-page__layout">
        <div className="not-found-page__content">
          <span className="not-found-page__code">404</span>
          <h1 id="not-found-title">{t("error.pageNotFound")}</h1>
          <p>{t("error.pageNotFoundDescription")}</p>
          <div className="not-found-page__path" title={location.pathname}>
            <i className="ri-route-line" aria-hidden="true" />
            <code>{location.pathname}</code>
          </div>
          <Button asChild className="not-found-page__action">
            <Link to="/">
              <i className="ri-arrow-left-line" aria-hidden="true" />
              {t("error.backToHome")}
            </Link>
          </Button>
        </div>

        <div className="not-found-page__visual" aria-hidden="true">
          <div className="not-found-page__digits">
            <span>4</span>
            <span className="not-found-page__signal">
              <i className="ri-pulse-line" />
            </span>
            <span>4</span>
          </div>
          <span className="not-found-page__visual-label">{t("error.pageNotFound")}</span>
        </div>
      </div>
    </section>
  )
}
