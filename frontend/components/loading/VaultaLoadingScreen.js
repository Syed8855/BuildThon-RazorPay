'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, RefreshCw, X, Zap } from 'lucide-react'

const VaultaLoadingScene = dynamic(
  () => import('./VaultaLoadingScene'),
  { ssr: false, loading: () => null }
)

const DEFAULT_SUBTITLES = [
  'Preparing your workspace',
  'Synchronizing recovery models',
  'Loading transaction intelligence',
  'Initializing rule guardrails',
]

export default function VaultaLoadingScreen({
  isReady = false,
  onReadyTransitionComplete,
  mode = 'fullscreen', // 'fullscreen' | 'modal' | 'inline'
  title = 'Waking up the recovery engine...',
  subtitles = DEFAULT_SUBTITLES,
  elapsedSeconds = 0,
  error = null,
  onRetry = null,
  onClose = null,
}) {
  const [subIndex, setSubIndex] = useState(0)

  useEffect(() => {
    if (!subtitles || subtitles.length === 0) return
    const interval = setInterval(() => {
      setSubIndex((prev) => (prev + 1) % subtitles.length)
    }, mode === 'fullscreen' ? 4500 : 2500)
    return () => clearInterval(interval)
  }, [subtitles, mode])

  useEffect(() => {
    if (isReady && onReadyTransitionComplete) {
      const timer = setTimeout(() => {
        onReadyTransitionComplete()
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [isReady, onReadyTransitionComplete])

  const isColdStart = elapsedSeconds >= 3 && !error

  // ── Scoped Modal / Inline Mode ─────────────────────────────────────────────
  if (mode === 'modal' || mode === 'scoped') {
    return (
      <AnimatePresence>
        {/* Backdrop Overlay */}
        <motion.div
          key="loader-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="drawer-overlay"
          style={{ zIndex: 1090 }}
          onClick={onClose}
        />

        {/* 3D Card Loading Container */}
        <motion.div
          key="loader-modal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            translateX: '-50%',
            translateY: '-50%',
            width: 'min(500px, 92vw)',
            background: '#070A14',
            border: error ? '1px solid rgba(224, 112, 112, 0.4)' : '1px solid rgba(82, 132, 255, 0.35)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-drawer), 0 0 40px rgba(49, 92, 255, 0.18)',
            zIndex: 1100,
            padding: '24px',
            overflow: 'hidden',
          }}
        >
          {/* Background Ambient Radial Glow */}
          <div
            style={{
              position: 'absolute',
              top: -50,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 380,
              height: 220,
              borderRadius: '50%',
              background: error
                ? 'radial-gradient(circle, rgba(224, 112, 112, 0.16) 0%, transparent 70%)'
                : isColdStart
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(82, 132, 255, 0.22) 0%, transparent 70%)',
              pointerEvents: 'none',
              transition: 'background 600ms ease',
            }}
          />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: error ? '#E07070' : isColdStart ? '#F59E0B' : 'var(--accent-bright)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: error ? '#E07070' : isColdStart ? '#F59E0B' : 'var(--accent-bright)',
                  boxShadow: `0 0 10px ${error ? '#E07070' : isColdStart ? '#F59E0B' : 'var(--accent-bright)'}`,
                  display: 'inline-block',
                  animation: error ? 'none' : 'pulse 1.8s infinite',
                }}
              />
              {error ? 'EXECUTION FAILED' : isColdStart ? 'COLD-START AWAKENING' : 'AUTONOMOUS RECOVERY'}
            </div>

            {onClose && (
              <button
                className="btn btn-icon"
                onClick={onClose}
                aria-label="Close loading dialog"
                style={{ width: 28, height: 28 }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 3D Rotating Razorpay Card Canvas */}
          {!error && (
            <div
              style={{
                width: '100%',
                height: 180,
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'none',
                margin: '-10px 0 6px 0',
              }}
            >
              <VaultaLoadingScene isReady={isReady} />
            </div>
          )}

          {/* Status & Subtext Typography */}
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginTop: error ? 12 : 0 }}>
            {error ? (
              /* Error State */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(224, 112, 112, 0.1)', border: '1px solid rgba(224, 112, 112, 0.3)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                  <AlertCircle className="w-5 h-5" style={{ color: '#E07070', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#E07070', marginBottom: 4 }}>
                      Request Timed Out or Failed
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      {error.message || 'The serverless backend did not respond within the allocated window. Please retry.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                  {onClose && (
                    <button className="btn btn-secondary" onClick={onClose} style={{ height: 36, padding: '0 16px', fontSize: 12 }}>
                      Dismiss
                    </button>
                  )}
                  {onRetry && (
                    <button className="btn btn-primary" onClick={onRetry} style={{ height: 36, padding: '0 18px', fontSize: 12, gap: 6 }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Action
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Normal / Cold-Start Loading State */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#FFFFFF',
                    margin: 0,
                  }}
                >
                  {title}
                </h3>

                <div style={{ height: 20, overflow: 'hidden' }}>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={subtitles[subIndex]}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      style={{
                        fontSize: 13,
                        color: '#737A8C',
                        margin: 0,
                      }}
                    >
                      {subtitles[subIndex]}…
                    </motion.p>
                  </AnimatePresence>
                </div>

                {/* Cold Start Banner after > 3s */}
                {isColdStart && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: 11.5,
                      color: '#F59E0B',
                      textAlign: 'left',
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    <Zap className="w-3.5 h-3.5" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Cold start in progress</strong> — first request may take up to 25s while backend wakes up.
                    </span>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  // ── Fullscreen Initial Load Mode ──────────────────────────────────────────
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
              key={isReady ? 'ready-sub' : subtitles[subIndex]}
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
              {isReady ? 'Launching workspace…' : subtitles[subIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
