'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'

const BackendContext = createContext({
  isReady: false,
  isChecking: true,
  checkBackend: async () => false,
})

export function BackendProvider({ children }) {
  const [isReady, setIsReady] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const isReadyRef = useRef(false)
  const pollTimerRef = useRef(null)

  const checkBackend = useCallback(async () => {
    if (isReadyRef.current) return true
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'ok' || data.status === 'healthy') {
          isReadyRef.current = true
          setIsReady(true)
          setIsChecking(false)
          if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
          return true
        }
      }
    } catch {
      // Backend still cold-starting or connecting
    }
    return false
  }, [])

  useEffect(() => {
    let mounted = true

    const poll = async () => {
      if (!mounted || isReadyRef.current) return
      const ready = await checkBackend()
      if (!ready && mounted) {
        pollTimerRef.current = setTimeout(poll, 3500)
      }
    }

    // Start checking immediately in background without blocking UI
    poll()

    return () => {
      mounted = false
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [checkBackend])

  return (
    <BackendContext.Provider value={{ isReady, isChecking, checkBackend }}>
      {children}
    </BackendContext.Provider>
  )
}

export function useBackend() {
  return useContext(BackendContext)
}
