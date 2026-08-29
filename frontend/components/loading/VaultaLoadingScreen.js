'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'

const VaultaLoadingScene = dynamic(
  () => import('./VaultaLoadingScene'),
  { ssr: false, loading: () => null }
)

const SUBTITLES = [
  'Preparing your workspace',
  'Synchronizing recovery models',
  'Loading transaction intelligence',
  'Initializing rule guardrails',
]

export default function VaultaLoadingScreen({ isReady = false, onReadyTransitionComplete }) {
  const [subIndex, setSubIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setSubIndex((prev) => (prev + 1) % SUBTITLES.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isReady && onReadyTransitionComplete) {
      const timer = setTimeout(() => {
        onReadyTransitionComplete()
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [isReady, onReadyTransitionComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        top: 60,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 90, // Below the z-index: 1000 navbar so navigation is ALWAYS clickable
        background: '#05070D',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background Radial Glow */}
      <div
        style={{
          position: 'absolute',
          width: 540,
          height: 540,
          borderRadius: '50%',
          background: isReady
            ? 'radial-gradient(circle, rgba(79, 111, 255, 0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(49, 92, 255, 0.12) 0%, transparent 70%)',
          transition: 'background 800ms ease',
          pointerEvents: 'none',
        }}
      />

      {/* 3D Vaulta Canvas Container */}
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          height: 360,
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <VaultaLoadingScene isReady={isReady} />
      </div>

      {/* Minimalist Status Typography */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          marginTop: 10,
          padding: '0 24px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: isReady ? '#7C8FFF' : '#5284FF',
            marginBottom: 8,
            transition: 'color 400ms ease',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isReady ? '#4F6FFF' : '#5284FF',
              boxShadow: `0 0 10px ${isReady ? '#4F6FFF' : '#5284FF'}`,
              display: 'inline-block',
            }}
          />
          REVENUE RECOVERY
        </div>

        <h2
          style={{
            fontSize: 'clamp(20px, 3vw, 24px)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: '#FFFFFF',
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          {isReady ? 'Recovery engine ready' : 'Waking up the recovery engine...'}
        </h2>

        <div style={{ height: 24, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={isReady ? 'ready-sub' : SUBTITLES[subIndex]}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                fontSize: 14,
                color: '#737A8C',
                margin: 0,
              }}
            >
              {isReady ? 'Launching workspace…' : SUBTITLES[subIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
