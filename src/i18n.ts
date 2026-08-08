import { useSyncExternalStore } from "react"

type AppLanguage = "en-US" | "zh-CN"
type MessageKey = "refreshing" | "error.pageNotFound" | "error.backToHome" | "error.somethingWentWrong"

const DEFAULT_LANGUAGE: AppLanguage = "en-US"
const LANGUAGE_STORAGE_KEY = "language"
const messages: Record<AppLanguage, Record<MessageKey, string>> = {
  "en-US": {
    refreshing: "Refreshing",
    "error.pageNotFound": "Page not found",
    "error.backToHome": "Back to home",
    "error.somethingWentWrong": "Something went wrong",
  },
  "zh-CN": {
    refreshing: "刷新中",
    "error.pageNotFound": "页面不存在",
    "error.backToHome": "回到主页",
    "error.somethingWentWrong": "出错了",
  },
}

const listeners = new Set<() => void>()

function normalizeLanguage(language: string | null | undefined): AppLanguage {
  return language?.toLowerCase().startsWith("zh") ? "zh-CN" : DEFAULT_LANGUAGE
}

function readStoredLanguage(): AppLanguage {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return DEFAULT_LANGUAGE
  }
}

let currentLanguage = readStoredLanguage()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getLanguageSnapshot() {
  return currentLanguage
}

export function hasStoredLanguage() {
  try {
    return Boolean(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return false
  }
}

export function setAppLanguage(language: string) {
  const nextLanguage = normalizeLanguage(language)
  if (nextLanguage === currentLanguage) return

  currentLanguage = nextLanguage
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
  } catch {
    // The UI can still switch language when persistent storage is unavailable.
  }
  listeners.forEach((listener) => listener())
}

export function useAppTranslation() {
  const language = useSyncExternalStore(subscribe, getLanguageSnapshot, () => DEFAULT_LANGUAGE)
  return (key: MessageKey) => messages[language][key]
}
