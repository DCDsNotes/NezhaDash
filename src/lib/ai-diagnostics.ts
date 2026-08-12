import type { AiServiceId } from "@/lib/network-diagnostics"

export interface AiDeviceInfo {
  timezone: string
  utcOffset: string
  languages: string
  primaryLanguage: string
  platform: string
  browser: string
  touch: boolean
  network: string
  doNotTrack: string
  cookies: boolean
  webglRenderer: string
  canvasFingerprint: string
  webglFingerprint: string
}

export const AI_SERVICE_PROFILES = {
  claude: {
    id: "claude",
    label: "Claude",
    icon: "ri-claude-line",
    targetIds: ["claude", "anthropic"],
    primaryTargetId: "claude",
  },
  chatgpt: {
    id: "chatgpt",
    label: "ChatGPT",
    icon: "ri-openai-line",
    targetIds: ["chatgpt", "openai"],
    primaryTargetId: "chatgpt",
  },
} satisfies Record<AiServiceId, { id: AiServiceId; label: string; icon: string; targetIds: string[]; primaryTargetId: string }>

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0")
}

function getPlatform(userAgent: string) {
  if (/Windows/i.test(userAgent)) return "Windows"
  if (/iPhone|iPad/i.test(userAgent)) return "iOS"
  if (/Android/i.test(userAgent)) return "Android"
  if (/Mac OS/i.test(userAgent)) return "macOS"
  if (/Linux/i.test(userAgent)) return "Linux"
  return "未知"
}

function getBrowser(userAgent: string) {
  const match =
    userAgent.match(/Edg\/([\d.]+)/)?.slice(0, 2) ||
    userAgent.match(/Chrome\/([\d.]+)/)?.slice(0, 2) ||
    userAgent.match(/Firefox\/([\d.]+)/)?.slice(0, 2) ||
    userAgent.match(/Version\/([\d.]+).*Safari/)?.slice(0, 2)
  if (!match) return "未知"
  const name = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : "Safari"
  return `${name} ${match[1]}`
}

function getUtcOffset() {
  const minutes = -new Date().getTimezoneOffset()
  const sign = minutes >= 0 ? "+" : "-"
  const absolute = Math.abs(minutes)
  return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`
}

function getGraphicsInfo() {
  let renderer = "不支持检测"
  let webglFingerprint = "不支持检测"
  let canvasFingerprint = "不支持检测"

  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl")
    if (gl) {
      const extension = gl.getExtension("WEBGL_debug_renderer_info") as
        | { UNMASKED_VENDOR_WEBGL: number; UNMASKED_RENDERER_WEBGL: number }
        | null
      const vendor = extension ? String(gl.getParameter(extension.UNMASKED_VENDOR_WEBGL)) : ""
      renderer = extension ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER))
      webglFingerprint = hashText(`${vendor}|${renderer}|${gl.getParameter(gl.VERSION)}|${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`)
    }
  } catch {
    // Browser privacy controls may intentionally block graphics details.
  }

  try {
    const canvas = document.createElement("canvas")
    canvas.width = 180
    canvas.height = 36
    const context = canvas.getContext("2d")
    if (context) {
      context.font = "13px sans-serif"
      context.fillStyle = "#0f766e"
      context.fillRect(8, 6, 52, 22)
      context.fillStyle = "#243448"
      context.fillText("network-check", 66, 21)
      canvasFingerprint = hashText(canvas.toDataURL())
    }
  } catch {
    // Browser privacy controls may intentionally block canvas reads.
  }

  return { renderer, canvasFingerprint, webglFingerprint }
}

export function getAiDeviceInfo(): AiDeviceInfo {
  const userAgent = navigator.userAgent
  const connection = navigator as Navigator & {
    connection?: { effectiveType?: string; type?: string }
    mozConnection?: { effectiveType?: string; type?: string }
    webkitConnection?: { effectiveType?: string; type?: string }
  }
  const network = connection.connection || connection.mozConnection || connection.webkitConnection
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  const graphics = getGraphicsInfo()

  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "未知",
    utcOffset: getUtcOffset(),
    languages: languages.filter(Boolean).join(", ") || "未知",
    primaryLanguage: (languages[0] || "").split("-")[0].toLowerCase(),
    platform: getPlatform(userAgent),
    browser: getBrowser(userAgent),
    touch: navigator.maxTouchPoints > 0,
    network: network?.effectiveType || network?.type || "浏览器未提供",
    doNotTrack: navigator.doNotTrack === "1" ? "已开启" : navigator.doNotTrack === "0" ? "已关闭" : "未设置",
    cookies: navigator.cookieEnabled,
    webglRenderer: graphics.renderer,
    canvasFingerprint: graphics.canvasFingerprint,
    webglFingerprint: graphics.webglFingerprint,
  }
}
