import { useEffect, useRef, useState } from "react"

export function useNearViewport<T extends Element>(rootMargin = "360px") {
  const ref = useRef<T | null>(null)
  const [nearViewport, setNearViewport] = useState(false)

  useEffect(() => {
    if (nearViewport) return

    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") {
      setNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setNearViewport(true)
        observer.disconnect()
      },
      { rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [nearViewport, rootMargin])

  return { ref, nearViewport }
}
