import { CODE_MAPS, aliasMapping, countryCodeMapping, type CodeMapInfo } from "./code-maps"

export const ALIAS_CODE: Record<string, string> = {
  ...aliasMapping,
  ...countryCodeMapping,
}

export const alias2code = (code?: string | null) => {
  if (!code) return undefined
  return ALIAS_CODE[code]
}

export const locationCode2Info = (code?: string | null): CodeMapInfo | undefined => {
  if (!code) return undefined
  const info = CODE_MAPS[code]
  if (info) return info
  const aliasCode = aliasMapping[code]
  if (aliasCode) return CODE_MAPS[aliasCode]
  return undefined
}

export const count2size = (count: number) => {
  if (count < 3) return 4
  if (count < 5) return 6
  return 8
}

export type WorldMapPointBox = {
  key: string
  left: number
  top: number
  size: number
  label: string
  type: "single" | "group"
  servers: unknown[]
  parent?: WorldMapPointBox
  children?: WorldMapPointBox[]
  topLeft: { left: number; top: number }
  bottomRight: { left: number; top: number }
}

export function findIntersectingGroups(coordinates: WorldMapPointBox[]) {
  const groups: Record<string, WorldMapPointBox[]> = {}
  coordinates.forEach((coordinate, index) => {
    const intersects: WorldMapPointBox[] = []
    const n = -2
    coordinates.forEach((otherCoordinate, otherIndex) => {
      if (index !== otherIndex) {
        if (
          coordinate.topLeft.top - otherCoordinate.bottomRight.top < n &&
          coordinate.topLeft.left - otherCoordinate.bottomRight.left < n &&
          coordinate.bottomRight.top - otherCoordinate.topLeft.top > -n &&
          coordinate.bottomRight.left - otherCoordinate.topLeft.left > -n
        ) {
          intersects.push(otherCoordinate)
        }
      }
    })
    if (intersects.length > 0) groups[coordinate.key] = intersects
  })
  return groups
}

