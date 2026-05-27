import { useEffect, useRef, useState, type RefObject } from "react"

export function useNearViewport<T extends HTMLElement>(rootMargin = "200px 0px"): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)

  useEffect(() => {
    if (isNearViewport) return

    const node = ref.current
    if (!node) return

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsNearViewport(true)
      return
    }

    let observer: IntersectionObserver | null = null
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true)
          observer?.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [isNearViewport, rootMargin])

  return [ref, isNearViewport]
}
