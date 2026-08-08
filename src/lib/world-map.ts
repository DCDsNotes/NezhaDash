import worldMapSvgSource from "@/assets/world-map.svg?raw"

export const worldMapImageUrl = URL.createObjectURL(new Blob([worldMapSvgSource], { type: "image/svg+xml" }))

let worldMapPreloadImage: HTMLImageElement | null = null
let worldMapPreloadPromise: Promise<void> | null = null

export function preloadWorldMapImage() {
  if (typeof Image === "undefined") return Promise.resolve()
  if (worldMapPreloadImage?.complete && worldMapPreloadPromise) return worldMapPreloadPromise
  if (worldMapPreloadPromise) return worldMapPreloadPromise

  worldMapPreloadPromise = new Promise<void>((resolve) => {
    const image = new Image()
    worldMapPreloadImage = image
    image.decoding = "async"
    image.onload = () => {
      void image
        .decode()
        .catch(() => undefined)
        .finally(resolve)
    }
    image.onerror = () => resolve()
    image.src = worldMapImageUrl
  })

  return worldMapPreloadPromise
}

export type WorldMapLocation = {
  key: string
  x: number
  y: number
  size?: number
  label?: string
  servers?: { id: number; name: string }[]
}

type RectLike = {
  key: string
  topLeft: { left: number; top: number }
  bottomRight: { left: number; top: number }
  parent?: RectLike
  children?: RectLike[]
}

export function count2size(count: number) {
  if (count < 3) return 4
  if (count < 5) return 6
  return 8
}

export function findIntersectingGroups<T extends RectLike>(coordinates: T[]) {
  const groups: Record<string, T[]> = {}

  coordinates.forEach((coordinate, index) => {
    const intersects: T[] = []
    const n = -2
    coordinates.forEach((otherCoordinate, otherIndex) => {
      if (index === otherIndex) return
      if (
        coordinate.topLeft.top - otherCoordinate.bottomRight.top < n &&
        coordinate.topLeft.left - otherCoordinate.bottomRight.left < n &&
        coordinate.bottomRight.top - otherCoordinate.topLeft.top > -n &&
        coordinate.bottomRight.left - otherCoordinate.topLeft.left > -n
      ) {
        intersects.push(otherCoordinate)
      }
    })
    if (intersects.length > 0) {
      groups[coordinate.key] = intersects
    }
  })

  return groups
}

export function lonLatToMapXY(lng: number, lat: number) {
  // Equirectangular mapping into 1280x621 canvas (matches current Vue map asset ratio)
  const x = ((lng + 180) / 360) * 1280
  const y = ((90 - lat) / 180) * 621
  return { x, y }
}
