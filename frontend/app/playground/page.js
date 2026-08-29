'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import OrchestratorLine from '@/components/OrchestratorLine'
import ShapBars from '@/components/ShapBars'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { playFailSound, playScanSound, playRetrySound, playSuccessSound } from '@/lib/soundEffects'
import { Sliders, Sparkles, Play, CheckCircle2, AlertCircle, RefreshCw, Zap, ArrowRight, ChevronDown } from 'lucide-react'

const AlinmaHeroScene = dynamic(() => import('@/components/hero/AlinmaHeroScene'), {
  ssr: false,
  loading: () => null,
})

const ease = [0.22, 1, 0.36, 1]

const FAILURE_REASONS = [
  'insufficient_funds',
  'issuer_declined',
  'do_not_honor',
  'processing_error',
  'network_timeout',
  'card_expired',
  'card_stolen',
  'account_closed',
]
const METHODS = ['card', 'upi', 'netbanking']
const MERCHANTS = ['saas', 'd2c_subscription', 'ecommerce_one_time']
const SEGMENTS = ['new', 'returning', 'high_value']
const REQUIRED = ['failure_reason', 'payment_method', 'merchant_category', 'customer_segment']

const DEFAULT = {
  failure_reason: 'insufficient_funds',
  attempt_number: 1,
  time_since_last_attempt_hours: 24,
  time_since_first_failure_hours: 24,
  is_near_payday: true,
  payment_method: 'card',
  is_recurring: true,
  merchant_category: 'saas',
  customer_segment: 'high_value',
  historical_failure_rate: 0.15,
  amount: 2499,
}

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n ?? 0)

function Field({ label, error, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

function AttemptPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            flex: 1,
            height: 40,
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${value === n ? 'var(--accent)' : 'var(--border)'}`,
            background: value === n ? 'var(--accent-subtle)' : 'transparent',
            color: value === n ? 'var(--accent-bright)' : 'var(--text-muted)',
            fontFamily: 'var(--font)',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 150ms var(--ease-out)',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function ResultPanel({ result }) {
  if (!result) return null
  const prob = result.model_output?.success_probability ?? null
  const probCls = prob === null ? '' : prob > 0.5 ? 'prob-val--high' : prob > 0.25 ? 'prob-val--mid' : 'prob-val--low'
  const mlChanged = result.orchestrator_decision?.action !== result.rules_only_decision?.action

  return (
    <motion.div
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <div className="card card--padded">
        <div className="drawer__section-hdr">ORCHESTRATOR DECISION</div>
        <OrchestratorLine decision={result.orchestrator_decision} />
      </div>

      <div className="card card--padded">
        <div className="drawer__section-hdr">RULES ONLY VS RULES + ML</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Rules Only Baseline
            </div>
            <OrchestratorLine decision={result.rules_only_decision} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
              Autonomous ML Hybrid
            </div>
            <OrchestratorLine decision={result.orchestrator_decision} />
          </div>
        </div>
        {mlChanged && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 14px',
              background: 'rgba(82,132,255,0.07)',
              border: '1px solid rgba(82,132,255,0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--accent-bright)',
              fontWeight: 600,
            }}
          >
            ✦ ML layer modified the execution outcome — delivering measurable recovery advantage over static rules
          </div>
        )}
      </div>

      {result.model_output && (
        <div className="card card--padded">
          <div className="drawer__section-hdr">ML RECOVERY CONFIDENCE & SHAP ATTRIBUTION</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div className={`prob-val ${probCls}`}>{prob != null ? (prob * 100).toFixed(0) : '-'}%</div>
              <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                success probability
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <ShapBars contributions={result.model_output.shap_contributions} />
            </div>
          </div>
        </div>
      )}

      {result.customer_message && (
        <div className="card card--padded">
          <div className="drawer__section-hdr">AUTOMATED CUSTOMER COMMUNICATION PREVIEW</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            "{result.customer_message}"
          </p>
        </div>
      )}
    </motion.div>
  )
}

export default function PlaygroundPage() {
  const { isReady: backendIsReady, checkBackend } = useBackend()
  const [form, setForm] = useState(DEFAULT)
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showVaulta, setShowVaulta] = useState(true)
  const [simStage, setSimStage] = useState('IDLE') // IDLE | INITIATING | FAILED | ANALYZING | RETRYING | RECOVERED
  const [stageMessage, setStageMessage] = useState('')

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const ready = await checkBackend()
      if (ready && mounted) {
        setShowVaulta(false)
      }
    }
    if (backendIsReady) {
      setShowVaulta(false)
    } else {
      init()
    }
    return () => {
      mounted = false
    }
  }, [backendIsReady, checkBackend])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: null }))
  }

  const validate = () => {
    const e = {}
    REQUIRED.forEach((k) => {
      if (!form[k]) e[k] = 'Required'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const runSimulation = async () => {
    if (!validate()) return
    setLoading(true)
    setError(null)
    setResult(null)

    // Sequence the live simulation stages alongside API call
    setSimStage('INITIATING')
    setStageMessage(`PAYMENT INITIATED · ${fmtINR(form.amount)}`)
    playScanSound()

    setTimeout(() => {
      setSimStage('FAILED')
      setStageMessage('PAYMENT FAILED')
      playFailSound()
    }, 1000)

    setTimeout(() => {
      setSimStage('ANALYZING')
      setStageMessage('RECOVERY ENGINE ANALYZING…')
      playScanSound()
    }, 2200)

    try {
      const d = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).then((r) => {
        if (!r.ok) throw r
        return r.json()
      })

      setTimeout(() => {
        setSimStage('RETRYING')
        setStageMessage('SMART RETRY · Optimal window detected')
        playRetrySound()
      }, 3400)

      setTimeout(() => {
        setSimStage('RECOVERED')
        setStageMessage(`✓ PAYMENT RECOVERED · +${fmtINR(form.amount)} ARR`)
        setResult(d)
        setLoading(false)
        playSuccessSound()
      }, 4800)

    } catch {
      setError('Simulation failed — engine is currently initializing, please retry.')
      setSimStage('IDLE')
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <AnimatePresence>
        {showVaulta && !backendIsReady && (
          <VaultaLoadingScreen
            isReady={backendIsReady}
            onReadyTransitionComplete={() => setShowVaulta(false)}
          />
        )}
      </AnimatePresence>

      <div className="container">
        <div className="page-hdr">
          <div className="eyebrow">
            <span className="eyebrow__dot" /> PLAYGROUND
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 8 }}>Infrastructure Workbench</h1>
          <p className="page-hdr__sub" style={{ margin: 0 }}>
            Interactive continuation of the Hero — control the engine and watch live 3D transaction recovery execute in real-time
          </p>
        </div>

        {/* ── Interactive 3D Card Header Showcase ──────────────── */}
        <div
          className="card"
          style={{
            position: 'relative',
            height: 300,
            overflow: 'hidden',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, rgba(11, 16, 29, 0.92) 0%, rgba(5, 7, 13, 0.95) 100%)',
          }}
        >
          {/* Background Ambient Glow */}
          <div
            style={{
              position: 'absolute',
              width: 560,
              height: 260,
              borderRadius: '50%',
              background:
                simStage === 'FAILED'
                  ? 'radial-gradient(ellipse, rgba(201, 90, 90, 0.25) 0%, transparent 70%)'
                  : simStage === 'RECOVERED'
                  ? 'radial-gradient(ellipse, rgba(242, 183, 5, 0.28) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse, rgba(49, 92, 255, 0.25) 0%, transparent 70%)',
              transition: 'background 800ms ease',
              pointerEvents: 'none',
            }}
          />

          <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <AlinmaHeroScene simStage={simStage} />
          </div>

          {/* Overlay Live State Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              background: 'rgba(5, 7, 13, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-pill)',
              padding: '10px 22px',
              fontSize: 13,
              fontWeight: 700,
              color: simStage === 'FAILED' ? '#E07070' : simStage === 'RECOVERED' ? '#F2B705' : '#6892FF',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: 'var(--shadow-card)',
              zIndex: 10,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: simStage === 'FAILED' ? '#E07070' : simStage === 'RECOVERED' ? '#F2B705' : '#6892FF',
                boxShadow: `0 0 12px ${simStage === 'FAILED' ? '#E07070' : simStage === 'RECOVERED' ? '#F2B705' : '#6892FF'}`,
              }}
            />
            {simStage === 'IDLE' ? 'ENGINE READY · Configure parameters below to simulate' : stageMessage}
          </div>
        </div>

        {/* Form & Diagnostics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 390px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* Input Configuration Panel */}
          <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
              Payment Failure Parameters
            </div>

            <Field label="Failure reason *" error={errors.failure_reason}>
              <select value={form.failure_reason} onChange={(e) => set('failure_reason', e.target.value)}>
                <option value="">— select reason —</option>
                {FAILURE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Transaction amount (₹)">
              <input
                type="number"
                value={form.amount}
                onChange={(e) => set('amount', Number(e.target.value))}
                min={1}
                style={{ fontWeight: 700, fontSize: 15 }}
              />
            </Field>

            <Field label="Attempt number">
              <AttemptPicker value={form.attempt_number} onChange={(v) => set('attempt_number', v)} />
            </Field>

            <Field label="Hours since last attempt">
              <input
                type="number"
                value={form.time_since_last_attempt_hours}
                onChange={(e) => set('time_since_last_attempt_hours', Number(e.target.value))}
                min={0}
              />
            </Field>

            <Field label="Payment method *" error={errors.payment_method}>
              <select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
                <option value="">— select method —</option>
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Merchant category *" error={errors.merchant_category}>
              <select value={form.merchant_category} onChange={(e) => set('merchant_category', e.target.value)}>
                <option value="">— select category —</option>
                {MERCHANTS.map((m) => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Customer segment *" error={errors.customer_segment}>
              <select value={form.customer_segment} onChange={(e) => set('customer_segment', e.target.value)}>
                <option value="">— select segment —</option>
                {SEGMENTS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={(e) => set('is_recurring', e.target.checked)}
                />
                Recurring subscription
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_near_payday}
                  onChange={(e) => set('is_near_payday', e.target.checked)}
                />
                Near payday
              </label>
            </div>

            <button
              className="btn btn-primary"
              onClick={runSimulation}
              disabled={loading}
              style={{ width: '100%', marginTop: 4, height: 48, fontSize: 15 }}
            >
              {loading ? 'Executing AI Orchestration…' : 'Run Simulation →'}
            </button>

            {error && <div className="state-error">{error}</div>}
          </div>

          {/* Real-time Output Panel */}
          <div>
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div
                  key="empty"
                  className="card card--padded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 380,
                    textAlign: 'center',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div style={{ fontSize: 40, opacity: 0.35 }}>⚡</div>
                  <div className="text-secondary" style={{ fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
                    Select payment failure parameters on the left and click <strong>"Run Simulation"</strong> to watch the 3D card and engine respond in real-time.
                  </div>
                </motion.div>
              )}
              {loading && (
                <motion.div
                  key="loading"
                  className="card card--padded state-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div style={{ fontSize: 32 }}>⚙️</div>
                  <div className="state-loading__title">{stageMessage || 'Evaluating Rules & XGBoost Model…'}</div>
                  <div className="state-loading__bar" />
                </motion.div>
              )}
              {result && !loading && (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ResultPanel result={result} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
