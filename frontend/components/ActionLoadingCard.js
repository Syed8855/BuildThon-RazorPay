'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw, X, Zap } from 'lucide-react'

export default function ActionLoadingCard({
  isOpen = true,
  title = 'Orchestrating Recovery Action',
  subtitles = [
    'Evaluating optimal delivery channel',
    'Calculating discount credit incentive',
    'Generating 1-click tokenized recovery link',
    'Synthesizing personalized copy',
  ],
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
    }, 2500)
    return () => clearInterval(interval)
  }, [subtitles])

  if (!isOpen) return null

  const isColdStart = elapsedSeconds >= 3 && !error

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="drawer-overlay"
        style={{ zIndex: 1090 }}
        onClick={onClose}
      />

      {/* Action Loading Card Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(480px, 92vw)',
          background: 'var(--surface)',
          border: error ? '1px solid rgba(224, 112, 112, 0.4)' : '1px solid rgba(82, 132, 255, 0.35)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-drawer), var(--shadow-glow)',
          zIndex: 1100,
          padding: '28px',
          overflow: 'hidden',
        }}
      >
        {/* Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 320,
            height: 180,
            borderRadius: '50%',
            background: error
              ? 'radial-gradient(circle, rgba(224, 112, 112, 0.18) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(82, 132, 255, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, position: 'relative', zIndex: 1 }}>
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
            {error ? 'EXECUTION FAILED' : isColdStart ? 'COLD-START AWAKENING' : 'AUTONOMOUS ORCHESTRATION'}
          </div>

          {onClose && (
            <button className="btn btn-icon" onClick={onClose} aria-label="Close loading modal" style={{ width: 28, height: 28 }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {error ? (
            /* Error State with Retry Option */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(224, 112, 112, 0.1)', border: '1px solid rgba(224, 112, 112, 0.3)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                <AlertCircle className="w-5 h-5" style={{ color: '#E07070', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#E07070', marginBottom: 4 }}>
                    Request Timed Out or Failed
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    {error.message || 'The backend service did not respond within the timeout window. Please retry to resume.'}
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
            /* In-Flight Loading State */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                  {title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, minHeight: 20 }}>
                  {subtitles[subIndex]}…
                </p>
              </div>

              {/* Progress Line */}
              <div style={{ width: '100%', height: 4, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                  style={{
                    width: '50%',
                    height: '100%',
                    background: isColdStart
                      ? 'linear-gradient(90deg, transparent, #F59E0B, transparent)'
                      : 'linear-gradient(90deg, transparent, var(--accent-bright), transparent)',
                    borderRadius: 2,
                  }}
                />
              </div>

              {/* Dynamic Cold-Start Banner after > 3s */}
              {isColdStart && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: 12,
                    color: '#F59E0B',
                    lineHeight: 1.4,
                  }}
                >
                  <Zap className="w-4 h-4" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Cold start in progress</strong> — first request may take up to 25s while the serverless container initializes.
                  </span>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
