import { cn } from "@/lib/utils"

const flagAssets = import.meta.glob("../../node_modules/flag-icons/flags/4x3/*.svg", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>

const flagUrls = Object.fromEntries(Object.entries(flagAssets).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -4), url])) as Record<
  string,
  string
>

let emojiFlagSupport: boolean | undefined

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
  // @ts-expect-error ForceUseSvgFlag is a global variable
  const forceUseSvgFlag = Boolean(window.ForceUseSvgFlag)

  const normalized = normalizeCountryCode(country_code)
  const flagUrl = flagUrls[normalized] || flagUrls.cn

  return (
    <span className={cn("server-flag", className)}>
      {forceUseSvgFlag || !supportsEmojiFlags() ? (
        <span className="fi" style={{ backgroundImage: `url("${flagUrl}")` }} />
      ) : (
        getUnicodeFlagIcon(normalized)
      )}
    </span>
  )
}
