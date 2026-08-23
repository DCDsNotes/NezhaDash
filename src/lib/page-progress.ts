let completionTimer = 0

function getProgressElement() {
  return document.getElementById("app-progress")
}

export function setPageProgress(value: number) {
  const progress = getProgressElement()
  if (!progress) return
  if (completionTimer) window.clearTimeout(completionTimer)
  const boundedValue = Math.max(4, Math.min(96, Math.round(value)))
  progress.style.setProperty("--app-progress-value", `${boundedValue}%`)
  progress.setAttribute("aria-valuenow", String(boundedValue))
  progress.classList.remove("is-complete")
  progress.classList.add("is-loading")
}

export function completePageProgress() {
  const progress = getProgressElement()
  if (!progress) return
  if (completionTimer) window.clearTimeout(completionTimer)
  progress.style.setProperty("--app-progress-value", "100%")
  progress.setAttribute("aria-valuenow", "100")
  progress.classList.remove("is-loading")
  progress.classList.add("is-complete")
  completionTimer = window.setTimeout(() => {
    progress.classList.remove("is-complete")
    completionTimer = 0
  }, 240)
}
