import { useEffect } from "react"

const FAVICON_SELECTOR = 'link[rel~="icon"]'
const ALERT_FAVICON_COLORS = ["#cf6844", "#e6a080"]
const PULSE_PATH = '<path d="M9 7.53861L15 21.5386L18.6594 13H23V11H17.3406L15 16.4614L9 2.46143L5.3406 11H1V13H6.6594L9 7.53861Z" fill="#fff" transform="translate(24 24) scale(6)"/>'

const alertFavicons = ALERT_FAVICON_COLORS.map((background) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="${background}"/>${PULSE_PATH}</svg>`)}`,
)

function restoreFavicons(links: HTMLLinkElement[], originalHrefs: Array<string | null>) {
  links.forEach((link, index) => {
    const originalHref = originalHrefs[index]
    if (originalHref == null) link.removeAttribute("href")
    else link.setAttribute("href", originalHref)
  })
}

export function useStatusFavicon(hasOfflineServers: boolean) {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR))
    if (links.length === 0) return

    const originalHrefs = links.map((link) => link.getAttribute("href"))
    if (!hasOfflineServers) return () => restoreFavicons(links, originalHrefs)

    let phase = 0
    const update = () => {
      const favicon = alertFavicons[phase]
      links.forEach((link) => link.setAttribute("href", favicon))
      phase = (phase + 1) % alertFavicons.length
    }

    update()
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => restoreFavicons(links, originalHrefs)

    const timer = window.setInterval(update, 850)
    return () => {
      window.clearInterval(timer)
      restoreFavicons(links, originalHrefs)
    }
  }, [hasOfflineServers])
}
