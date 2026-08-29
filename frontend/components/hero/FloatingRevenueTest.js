'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

const ease = [0.22, 1, 0.36, 1]
const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

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

  const runSimulation = () => {
    if (stage !== 'IDLE' && stage !== 'RECOVERED') return

    // Stage 1: PAYMENT INITIATED
    setStage('INITIATING')
    setSimStepText(`PAYMENT INITIATED · ${fmtINR(amount)}`)
    if (onStageChange) onStageChange('INITIATING')

    // Stage 2: PAYMENT FAILED
    setTimeout(() => {
      setStage('FAILED')
      setSimStepText('PAYMENT FAILED')
      if (onStageChange) onStageChange('FAILED')
    }, 1100)

    // Stage 3: RECOVERY ENGINE ANALYZING
    setTimeout(() => {
      setStage('ANALYZING')
      setSimStepText('RECOVERY ENGINE ANALYZING…')
      if (onStageChange) onStageChange('ANALYZING')
    }, 2300)

    // Stage 4: SMART RETRY
    setTimeout(() => {
      setStage('RETRYING')
      setSimStepText('SMART RETRY · Optimal window detected')
      if (onStageChange) onStageChange('RETRYING')
    }, 3600)

    // Stage 5 & 6: PAYMENT RECOVERED
    setTimeout(() => {
      setStage('RECOVERED')
      setSimStepText(`✓ PAYMENT RECOVERED · +${fmtINR(amount)}`)
      if (onStageChange) onStageChange('RECOVERED')
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
        width: 'min(440px, 92vw)',
        background: 'rgba(11, 16, 28, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(82, 132, 255, 0.22)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 36px rgba(49, 92, 255, 0.16)',
        padding: '24px',
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
              background: 'var(--accent)',
              boxShadow: '0 0 10px var(--accent)',
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            REVENUE TEST
          </span>
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

      {/* Interactive Form Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Amount Input */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label className="field-label">Amount</label>
            <input
              type="number"
              className="input"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={stage !== 'IDLE' && stage !== 'RECOVERED'}
              style={{ fontWeight: 600 }}
            />
          </div>

          <div className="field">
            <label className="field-label">Payment Method</label>
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
          <label className="field-label">Failure Reason</label>
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
            height: 44,
            fontSize: 14,
            fontWeight: 600,
            marginTop: 4,
            background: stage === 'RECOVERED' ? '#315CFF' : 'var(--accent-cta)',
          }}
        >
          {stage === 'IDLE' || stage === 'RECOVERED' ? (
            <>
              Run Recovery <Play className="w-4 h-4 fill-current" />
            </>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles className="w-4 h-4 animate-spin" /> Simulating Engine…
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
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 13,
                fontWeight: 600,
                background:
                  stage === 'FAILED'
                    ? 'rgba(155, 71, 71, 0.15)'
                    : stage === 'RECOVERED'
                    ? 'rgba(242, 183, 5, 0.15)'
                    : 'rgba(82, 132, 255, 0.14)',
                border: `1px solid ${
                  stage === 'FAILED'
                    ? 'rgba(155, 71, 71, 0.3)'
                    : stage === 'RECOVERED'
                    ? 'rgba(242, 183, 5, 0.35)'
                    : 'rgba(82, 132, 255, 0.3)'
                }`,
                color:
                  stage === 'FAILED'
                    ? '#C97070'
                    : stage === 'RECOVERED'
                    ? '#F2B705'
                    : '#5284FF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {stage === 'FAILED' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {stage === 'RECOVERED' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                {(stage === 'INITIATING' || stage === 'ANALYZING' || stage === 'RETRYING') && (
                  <Sparkles className="w-4 h-4 flex-shrink-0 animate-pulse" />
                )}
                <span>{simStepText}</span>
              </div>
              {stage === 'RECOVERED' && (
                <span className="badge badge--recovered" style={{ fontSize: 10 }}>
                  SAVED
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
