'use client'

import { useEffect, useRef } from 'react'

function sendDurationBeacon(viewId: string, startedAt: number): void {
  const durationSeconds = (Date.now() - startedAt) / 1000
  const body = new Blob([JSON.stringify({ durationSeconds })], { type: 'application/json' })
  navigator.sendBeacon(`/api/zobrazeni/${viewId}/trvani`, body)
}

interface ViewDurationTrackerProps {
  viewId: string
}

/**
 * Neviditelná komponenta na detailu inzerátu/kanceláře — měří dobu strávenou
 * na stránce a při odchodu (zavření karty, přepnutí, i klientská navigace
 * v Next.js) ji jednorázově pošle na server přes sendBeacon.
 */
export function ViewDurationTracker({ viewId }: ViewDurationTrackerProps) {
  const startedAtRef = useRef(0)
  const sentRef = useRef(false)

  useEffect(() => {
    startedAtRef.current = Date.now()
    sentRef.current = false

    function send() {
      if (sentRef.current) return
      sentRef.current = true
      sendDurationBeacon(viewId, startedAtRef.current)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') send()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', send)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', send)
      send()
    }
  }, [viewId])

  return null
}
