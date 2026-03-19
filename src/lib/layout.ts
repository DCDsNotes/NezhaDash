export function computeDetailContainerWidth(viewportWidth: number) {
  if (viewportWidth <= 720) return viewportWidth
  if (viewportWidth <= 800) return 720
  if (viewportWidth <= 1024) return 800
  if (viewportWidth <= 1920) return 760
  return 900
}

export function computeWorldMapWidth(viewportWidth: number) {
  const containerWidth = computeDetailContainerWidth(viewportWidth)
  const baseWidth = Math.max(containerWidth - 40, 300)
  if (viewportWidth <= 1920 && viewportWidth > 1024) {
    return Math.min(baseWidth, 700)
  }
  return baseWidth
}

