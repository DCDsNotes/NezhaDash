import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

let emojiFlagSupport: boolean | undefined
let flagAssetsPromise: Promise<typeof import("@/lib/flag-assets")> | null = null

function loadFlagAssets() {
  flagAssetsPromise ||= import("@/lib/flag-assets")
  return flagAssetsPromise
}

function normalizeCountryCode(raw: string | null | undefined) {
  const code = String(raw || "").trim()
  if (!code) return "cn"
  const lower = code.toLowerCase()
  if (!/^[a-z]{2}$/.test(lower)) return "cn"
  if (lower === "tw") return "cn"
  return lower
}

function supportsEmojiFlags() {
  if (emojiFlagSupport != null) return emojiFlagSupport

  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) return (emojiFlagSupport = false)

  context.fillStyle = "#000"
  context.textBaseline = "top"
  context.font = "32px Arial"
  context.fillText("\u{1f1fa}\u{1f1f8}", 0, 0)
  emojiFlagSupport = context.getImageData(16, 16, 1, 1).data[3] !== 0
  return emojiFlagSupport
}

function getUnicodeFlagIcon(countryCode: string) {
  return [...countryCode.toUpperCase()].map((character) => String.fromCodePoint(127397 + character.charCodeAt(0))).join("")
}

export default function ServerFlag({ country_code, className }: { country_code: string; className?: string }) {
  const forceUseSvgFlag = Boolean(window.ForceUseSvgFlag)
  const normalized = normalizeCountryCode(country_code)
  const useSvg = forceUseSvgFlag || !supportsEmojiFlags()
  const [flagUrl, setFlagUrl] = useState("")

  useEffect(() => {
    if (!useSvg) return
    let active = true
    void loadFlagAssets().then(({ getFlagUrl }) => {
      if (active) setFlagUrl(getFlagUrl(normalized))
    })
    return () => {
      active = false
    }
  }, [normalized, useSvg])

  return (
    <span className={cn("server-flag", className)}>
      {useSvg && flagUrl ? <span className="fi" style={{ backgroundImage: `url("${flagUrl}")` }} /> : getUnicodeFlagIcon(normalized)}
    </span>
  )
}
