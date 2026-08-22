import { useEffect, useRef, useState } from "react"

const RUNNING_PROGRESS = 72
const HIDE_DELAY = 240

export default function PageLoadProgress({ loading, pageKey }: { loading: boolean; pageKey: string }) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const frameRef = useRef(0)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)

    setVisible(true)
    setProgress(0)
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => {
        setProgress(loading ? RUNNING_PROGRESS : 100)
      })
    })

    if (!loading) {
      hideTimerRef.current = setTimeout(() => setVisible(false), HIDE_DELAY)
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [pageKey])

  useEffect(() => {
    if (loading) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      setVisible(true)
      setProgress(0)
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = requestAnimationFrame(() => setProgress(RUNNING_PROGRESS))
      })
      return
    }

    setProgress(100)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setVisible(false), HIDE_DELAY)
  }, [loading])

  return (
    <span className="probe-page-progress" data-visible={visible || undefined} aria-hidden="true">
      <span style={{ transform: `scaleX(${progress / 100})` }} />
    </span>
  )
}
