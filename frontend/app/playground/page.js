'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OrchestratorLine from '@/components/OrchestratorLine'
import ShapBars from '@/components/ShapBars'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { Sliders, Sparkles, Play, CheckCircle2 } from 'lucide-react'

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

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

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
            height: 38,
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${value === n ? 'var(--accent)' : 'var(--border)'}`,
            background: value === n ? 'var(--accent-subtle)' : 'transparent',
            color: value === n ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font)',
            fontWeight: 600,
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
      {/* 1. Orchestrator Decision — first per spec */}
      <div className="card card--padded">
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}
        >
          ORCHESTRATOR DECISION
        </div>
        <OrchestratorLine decision={result.orchestrator_decision} />
      </div>

      {/* 2. Rules vs ML comparison */}
      <div className="card card--padded">
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}
        >
          RULES ONLY VS RULES + ML
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
              Rules Only Baseline
            </div>
            <OrchestratorLine decision={result.rules_only_decision} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
              Autonomous ML Hybrid
            </div>
            <OrchestratorLine decision={result.orchestrator_decision} />
          </div>
        </div>
        {mlChanged && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'rgba(82,132,255,0.07)',
              border: '1px solid rgba(82,132,255,0.15)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--accent)',
            }}
          >
            ✦ ML layer modified the execution outcome — delivering measurable recovery advantage over static rules
          </div>
        )}
      </div>

      {/* 3. Model Output & SHAP */}
      {result.model_output && (
        <div className="card card--padded">
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            ML RECOVERY CONFIDENCE & SHAP ATTRIBUTION
          </div>
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

      {/* 4. Customer Message */}
      {result.customer_message && (
        <div className="card card--padded">
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            AUTOMATED CUSTOMER COMMUNICATION PREVIEW
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
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

  // Warmup check on mount
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
    try {
      const d = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).then((r) => {
        if (!r.ok) throw r
        return r.json()
      })
      setResult(d)
    } catch {
      setError('Simulation failed — engine is currently initializing, please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      {/* 3D Vaulta Loading Experience if backend is warming up */}
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
            <span className="eyebrow__dot" /> RECOVERY SIMULATION
          </div>
          <h1>Revenue Recovery Playground</h1>
          <p className="page-hdr__sub">
            Simulate any payment failure through the full rules + ML orchestrator pipeline with real-time explainability
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 390px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* Input Configuration Panel */}
          <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>
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
              style={{ width: '100%', marginTop: 6 }}
            >
              {loading ? 'Evaluating AI Orchestration…' : 'Run Simulation →'}
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
                    gap: 14,
                  }}
                >
                  <div style={{ fontSize: 36, opacity: 0.35 }}>⚡</div>
                  <div className="text-secondary" style={{ fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
                    Select payment failure parameters on the left and click <strong>"Run Simulation"</strong> to inspect the autonomous recovery orchestrator.
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
                  <div style={{ fontSize: 28 }}>⚙️</div>
                  <div className="state-loading__title">Evaluating Rules & XGBoost Model…</div>
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
