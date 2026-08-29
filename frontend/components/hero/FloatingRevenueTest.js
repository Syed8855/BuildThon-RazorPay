'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Volume2, Zap } from 'lucide-react'
import { playFailSound, playScanSound, playRetrySound, playSuccessSound } from '@/lib/soundEffects'

const ease = [0.22, 1, 0.36, 1]
const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

const PRESETS = [
  { label: 'SaaS Sub · ₹2,499', amount: 2499, method: 'Card', reason: 'insufficient_funds' },
  { label: 'Enterprise · ₹14,999', amount: 14999, method: 'Netbanking', reason: 'processing_error' },
  { label: 'UPI Recurring · ₹499', amount: 499, method: 'UPI', reason: 'issuer_declined' },
]

const REASONS = [
  { id: 'insufficient_funds', label: 'Insufficient funds' },
  { id: 'issuer_declined', label: 'Issuer declined' },
  { id: 'do_not_honor', label: 'Do not honor' },
  { id: 'processing_error', label: 'Processing error' },
]

const METHODS = ['Card', 'UPI', 'Netbanking']

export default function FloatingRevenueTest({ onStageChange }) {
  const [amount, setAmount] = useState(2499)
  const [method, setMethod] = useState('Card')
  const [reason, setReason] = useState('insufficient_funds')
  const [stage, setStage] = useState('IDLE') // IDLE | INITIATING | FAILED | ANALYZING | RETRYING | RECOVERED
  const [simStepText, setSimStepText] = useState('')

  const applyPreset = (preset) => {
    if (stage !== 'IDLE' && stage !== 'RECOVERED') return
    setAmount(preset.amount)
    setMethod(preset.method)
    setReason(preset.reason)
  }

  const runSimulation = () => {
    if (stage !== 'IDLE' && stage !== 'RECOVERED') return

    // Stage 1: PAYMENT INITIATED
    setStage('INITIATING')
    setSimStepText(`PAYMENT INITIATED · ${fmtINR(amount)}`)
    if (onStageChange) onStageChange('INITIATING')
    playScanSound()

    // Stage 2: PAYMENT FAILED
    setTimeout(() => {
      setStage('FAILED')
      setSimStepText('PAYMENT FAILED')
      if (onStageChange) onStageChange('FAILED')
      playFailSound()
    }, 1100)

    // Stage 3: RECOVERY ENGINE ANALYZING
    setTimeout(() => {
      setStage('ANALYZING')
      setSimStepText('RECOVERY ENGINE ANALYZING…')
      if (onStageChange) onStageChange('ANALYZING')
      playScanSound()
    }, 2300)

    // Stage 4: SMART RETRY
    setTimeout(() => {
      setStage('RETRYING')
      setSimStepText('SMART RETRY · Optimal window detected')
      if (onStageChange) onStageChange('RETRYING')
      playRetrySound()
    }, 3600)

    // Stage 5 & 6: PAYMENT RECOVERED
    setTimeout(() => {
      setStage('RECOVERED')
      setSimStepText(`✓ PAYMENT RECOVERED · +${fmtINR(amount)} ARR`)
      if (onStageChange) onStageChange('RECOVERED')
      playSuccessSound()
    }, 5000)
  }

  const resetSim = () => {
    setStage('IDLE')
    setSimStepText('')
    if (onStageChange) onStageChange('IDLE')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.3, ease }}
      style={{
        width: 'min(460px, 94vw)',
        background: 'rgba(11, 16, 29, 0.86)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(82, 132, 255, 0.28)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65), 0 0 44px rgba(49, 92, 255, 0.2)',
        padding: '26px',
        position: 'relative',
        zIndex: 20,
        pointerEvents: 'auto',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#5284FF',
              boxShadow: '0 0 12px #5284FF',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            REVENUE RECOVERY TEST
          </span>
          <Volume2 className="w-3.5 h-3.5 text-muted opacity-60 ml-1" title="Audio Enabled" />
        </div>
        {stage !== 'IDLE' && (
          <button
            onClick={resetSim}
            className="btn btn-ghost"
            style={{ height: 28, padding: '0 10px', fontSize: 11, gap: 4 }}
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Preset Chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            disabled={stage !== 'IDLE' && stage !== 'RECOVERED'}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              border: `1px solid ${amount === p.amount ? 'var(--accent)' : 'var(--border)'}`,
              background: amount === p.amount ? 'rgba(82, 132, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: amount === p.amount ? 'var(--accent-bright)' : 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
          >
            <Zap className="w-3 h-3 inline mr-1 opacity-70" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Interactive Form Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Amount & Method */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="field-label">Amount (₹)</label>
            <input
              type="number"
              className="input"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={stage !== 'IDLE' && stage !== 'RECOVERED'}
              style={{ fontWeight: 700, fontSize: 15 }}
            />
          </div>

          <div className="field">
            <label className="field-label">Payment Channel</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={stage !== 'IDLE' && stage !== 'RECOVERED'}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Failure Reason */}
        <div className="field">
          <label className="field-label">Simulated Failure Code</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={stage !== 'IDLE' && stage !== 'RECOVERED'}
          >
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action Button */}
        <button
          className="btn btn-primary"
          onClick={runSimulation}
          disabled={stage !== 'IDLE' && stage !== 'RECOVERED'}
          style={{
            width: '100%',
            height: 46,
            fontSize: 15,
            fontWeight: 700,
            marginTop: 4,
            background: stage === 'RECOVERED' ? 'linear-gradient(135deg, #F2B705, #D49B4B)' : 'var(--accent-cta)',
            color: stage === 'RECOVERED' ? '#000000' : '#FFFFFF',
          }}
        >
          {stage === 'IDLE' || stage === 'RECOVERED' ? (
            <>
              Run Recovery Simulation <Play className="w-4 h-4 fill-current ml-1" />
            </>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles className="w-4 h-4 animate-spin" /> Evaluating ML Pipeline…
            </span>
          )}
        </button>

        {/* Simulation Output Banner */}
        <AnimatePresence mode="wait">
          {stage !== 'IDLE' && (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease }}
              style={{
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13.5,
                fontWeight: 700,
                background:
                  stage === 'FAILED'
                    ? 'rgba(201, 90, 90, 0.18)'
                    : stage === 'RECOVERED'
                    ? 'rgba(242, 183, 5, 0.18)'
                    : 'rgba(82, 132, 255, 0.16)',
                border: `1px solid ${
                  stage === 'FAILED'
                    ? 'rgba(201, 90, 90, 0.35)'
                    : stage === 'RECOVERED'
                    ? 'rgba(242, 183, 5, 0.45)'
                    : 'rgba(82, 132, 255, 0.35)'
                }`,
                color:
                  stage === 'FAILED'
                    ? '#E07070'
                    : stage === 'RECOVERED'
                    ? '#F2B705'
                    : '#6892FF',
                boxShadow: stage === 'RECOVERED' ? 'var(--shadow-gold)' : 'var(--shadow-glow)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {stage === 'FAILED' && <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />}
                {stage === 'RECOVERED' && <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />}
                {(stage === 'INITIATING' || stage === 'ANALYZING' || stage === 'RETRYING') && (
                  <Sparkles className="w-4.5 h-4.5 flex-shrink-0 animate-pulse" />
                )}
                <span>{simStepText}</span>
              </div>
              {stage === 'RECOVERED' && (
                <span className="badge badge--recovered" style={{ fontSize: 11, background: '#F2B705', color: '#000' }}>
                  RECOVERED
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
