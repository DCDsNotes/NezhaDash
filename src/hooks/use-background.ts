import { useEffect, useState } from "react"

declare global {
  interface Window {
    CustomBackgroundImage: string
    CustomMobileBackgroundImage: string
    ForceShowServices: boolean
    ForceCardInline: boolean
    ForceShowMap: boolean
    ForcePeakCutEnabled: boolean
  }
}

const BACKGROUND_CHANGE_EVENT = "backgroundChange"

function readBackgroundImage() {
  if (window.CustomBackgroundImage) return window.CustomBackgroundImage

  const savedImage = sessionStorage.getItem("savedBackgroundImage") || ""
  if (savedImage) window.CustomBackgroundImage = savedImage
  return savedImage || undefined
}

export function useBackground(refreshKey?: unknown) {
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(undefined)

  useEffect(() => {
    const syncBackground = () => setBackgroundImage(readBackgroundImage())

    syncBackground()
    window.addEventListener(BACKGROUND_CHANGE_EVENT, syncBackground)

    return () => window.removeEventListener(BACKGROUND_CHANGE_EVENT, syncBackground)
  }, [refreshKey])

  const updateBackground = (newBackground: string | undefined) => {
    window.CustomBackgroundImage = newBackground || ""
    window.dispatchEvent(new Event(BACKGROUND_CHANGE_EVENT))
  }

  return { backgroundImage, updateBackground }
}
