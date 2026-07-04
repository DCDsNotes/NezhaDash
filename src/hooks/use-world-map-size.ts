import { useEffect, useMemo, useState } from "react"

import { computeWorldMapWidth } from "@/lib/layout"

function getWorldMapWidth() {
  return typeof window === "undefined" ? 900 : computeWorldMapWidth(window.innerWidth)
}

export function useWorldMapSize(enabled = true) {
  const [width, setWidth] = useState<number>(() => getWorldMapWidth())

  useEffect(() => {
    if (!enabled) return

    let frameId = 0

    const updateWidth = () => {
      frameId = 0
      const nextWidth = getWorldMapWidth()
      setWidth((prevWidth) => (prevWidth === nextWidth ? prevWidth : nextWidth))
    }

    const handleResize = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(updateWidth)
    }

    handleResize()
    window.addEventListener("resize", handleResize, { passive: true })
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      window.removeEventListener("resize", handleResize)
    }
  }, [enabled])

  const height = useMemo(() => Math.ceil((621 / 1280) * (Number(width) || 0)), [width])

  return { width, height }
}
