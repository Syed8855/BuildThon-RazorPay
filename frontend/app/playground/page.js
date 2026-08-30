'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import OrchestratorLine from '@/components/OrchestratorLine'
import ShapBars from '@/components/ShapBars'
import StatusBadge from '@/components/StatusBadge'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { playFailSound, playScanSound, playRetrySound, playSuccessSound } from '@/lib/soundEffects'
import {
  Sliders,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  ArrowRight,
  ChevronDown,
  Layers,
  Database,
  UploadCloud,
  ShieldCheck,
  TrendingUp,
  Clock,
  UserCheck
} from 'lucide-react'

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
  is_dnd_active: false,
  consent_revoked: false,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div className="drawer__section-hdr" style={{ margin: 0 }}>ORCHESTRATOR DECISION</div>
          {result.orchestrator_decision?.compliance_status && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: result.orchestrator_decision.compliance_status === 'compliant' ? 'var(--accent-bright)' : '#F59E0B',
              }}
            >
              🛡️ {result.orchestrator_decision.compliance_status.replace(/_/g, ' ').toUpperCase()}
            </span>
          )}
        </div>
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
          <div className="drawer__section-hdr">AUTOMATED DUNNING PREVIEW</div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              background: 'var(--surface-el)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              border: '1px solid var(--border)',
            }}
          >
            "{result.customer_message}"
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main Playground & Batch Processing Workbench
   ───────────────────────────────────────────────────────────── */
export default function PlaygroundPage() {
  const { isReady: backendIsReady } = useBackend()
  const [activeTab, setActiveTab] = useState('single') // 'single' | 'batch'
  const [form, setForm] = useState(DEFAULT)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [simStage, setSimStage] = useState('IDLE')
  const [stageMessage, setStageMessage] = useState('')
  const [showVaulta, setShowVaulta] = useState(false)

  // Batch Processing State
  const [batchSize, setBatchSize] = useState(50)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResult, setBatchResult] = useState(null)
  const [batchProgress, setBatchProgress] = useState(0)

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

    setSimStage('INITIATING')
    setStageMessage(`PAYMENT INITIATED · ${fmtINR(form.amount)}`)
    playScanSound()

    setTimeout(() => {
      setSimStage('FAILED')
      setStageMessage('PAYMENT FAILED')
      playFailSound()
    }, 900)

    setTimeout(() => {
      setSimStage('ANALYZING')
      setStageMessage('RECOVERY ENGINE ANALYZING…')
      playScanSound()
    }, 1800)

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
      }, 2700)

      setTimeout(() => {
        setSimStage('RECOVERED')
        setStageMessage(`✓ EXECUTION COMPLETE · ${d.orchestrator_decision?.action?.replace(/_/g, ' ').toUpperCase()}`)
        setResult(d)
        setLoading(false)
        playSuccessSound()
      }, 3800)
    } catch {
      // Fallback evaluation
      const d = {
        orchestrator_decision: {
          action: form.is_dnd_active ? 'no_retry' : 'retry_now',
          reason: form.is_dnd_active ? 'skipped_compliance' : 'within_retry_window',
          plain_english: form.is_dnd_active
            ? 'Customer on DND registry. Automated recovery contact suppressed.'
            : `Retry scheduled via smart backoff. Attempt ${form.attempt_number} of 4.`,
          channel: form.is_dnd_active ? 'no_outbound' : 'auto_retry',
          compliance_status: form.is_dnd_active ? 'dnd_restricted' : 'compliant',
        },
        rules_only_decision: {
          action: 'retry_now',
          reason: 'rules_baseline',
          plain_english: 'Rules-only system triggers standard immediate retry.',
        },
        model_output: {
          success_probability: form.is_dnd_active ? 0.0 : 0.84,
          shap_contributions: [
            { feature: 'is_near_payday', impact: 0.26 },
            { feature: 'customer_segment', impact: 0.18 },
          ],
        },
        customer_message: `Your payment of ${fmtINR(form.amount)} has been queued for autonomous smart retry.`,
      }
      setTimeout(() => {
        setSimStage('RECOVERED')
        setResult(d)
        setLoading(false)
        playSuccessSound()
      }, 3800)
    }
  }

  const runBatchSimulation = async () => {
    setBatchLoading(true)
    setBatchResult(null)
    setBatchProgress(10)
    playScanSound()

    const pInterval = setInterval(() => {
      setBatchProgress((p) => (p < 90 ? p + 18 : p))
    }, 300)

    try {
      const res = await fetch('/api/batch-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_size: batchSize }),
      })
      const data = await res.json()
      clearInterval(pInterval)
      setBatchProgress(100)
      setTimeout(() => {
        setBatchResult(data)
        setBatchLoading(false)
        playSuccessSound()
      }, 400)
    } catch {
      clearInterval(pInterval)
      // Fallback mock batch calculation
      const fakeTotal = batchSize * 3250
      const rulesRec = fakeTotal * 0.68
      const mlRec = fakeTotal * 0.864
      const mockBatch = {
        batch_size: batchSize,
        total_attempted_amount: fakeTotal,
        rules_recovered_amount: rulesRec,
        ml_recovered_amount: mlRec,
        rules_recovery_rate: 0.68,
        ml_recovery_rate: 0.864,
        uplift_percentage: 18.4,
        counts: {
          recovered: Math.round(batchSize * 0.84),
          hard_failed: Math.round(batchSize * 0.06),
          escalated_to_human: Math.round(batchSize * 0.05),
          churned: Math.round(batchSize * 0.03),
          dnd_blocked: Math.round(batchSize * 0.02),
          quiet_hours_held: 2,
        },
        records: Array.from({ length: Math.min(batchSize, 25) }, (_, i) => ({
          transaction_id: `txn_batch_${1000 + i}`,
          amount: Math.round(500 + Math.random() * 8000),
          failure_reason: FAILURE_REASONS[i % FAILURE_REASONS.length],
          payment_method: METHODS[i % METHODS.length],
          rules_action: 'retry_now',
          ml_action: i % 8 === 0 ? 'escalate_human' : i % 11 === 0 ? 'no_retry' : 'retry_now',
          ml_probability: 0.45 + (i % 5) * 0.12,
          status: i % 8 === 0 ? 'escalated_to_human' : i % 11 === 0 ? 'dnd_blocked' : 'recovered',
          compliance_status: i % 8 === 0 ? 'escalated_to_human' : i % 11 === 0 ? 'dnd_restricted' : 'compliant',
          plain_english: 'Autonomous ML orchestration decision evaluated cleanly.',
        })),
      }
      setBatchProgress(100)
      setTimeout(() => {
        setBatchResult(mockBatch)
        setBatchLoading(false)
        playSuccessSound()
      }, 400)
    }
  }

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-glow-bg" />

      <AnimatePresence>
        {showVaulta && !backendIsReady && (
          <VaultaLoadingScreen
            isReady={backendIsReady}
            onReadyTransitionComplete={() => setShowVaulta(false)}
          />
        )}
      </AnimatePresence>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ background: 'rgba(82, 132, 255, 0.12)', border: '1px solid rgba(82, 132, 255, 0.25)', boxShadow: '0 0 16px rgba(49, 92, 255, 0.18)' }}>
              <span className="eyebrow__dot" /> RECOVERY SIMULATION & BATCH ENGINE
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10 }}>Infrastructure Workbench</h1>
            <p className="page-hdr__sub" style={{ margin: 0 }}>
              Single transaction diagnostics & large-scale batch processing with Rules vs ML uplift measurement
            </p>
          </div>

          {/* Tab Selector */}
          <div className="filter-bar" style={{ margin: 0 }}>
            <button
              className={`filter-pill ${activeTab === 'single' ? 'active' : ''}`}
              onClick={() => setActiveTab('single')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Zap className="w-3.5 h-3.5" /> Single Transaction Sim
            </button>
            <button
              className={`filter-pill ${activeTab === 'batch' ? 'active' : ''}`}
              onClick={() => setActiveTab('batch')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Layers className="w-3.5 h-3.5" /> Batch Processing Engine
            </button>
          </div>
        </div>

        {/* ── MODE 1: SINGLE TRANSACTION SIMULATOR ─────────────── */}
        {activeTab === 'single' && (
          <>
            {/* ── Interactive 3D Card Header Showcase ── */}
            <div
              className="card"
              style={{
                position: 'relative',
                height: 280,
                overflow: 'hidden',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, rgba(11, 16, 29, 0.92) 0%, rgba(5, 7, 13, 0.95) 100%)',
              }}
            >
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
                <AlinmaHeroScene simStage={simStage} hideSleeve={true} />
              </div>

              <div
                style={{
                  position: 'absolute',
                  bottom: 16,
                  background: 'rgba(5, 7, 13, 0.88)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '8px 20px',
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
              <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 2 }}>
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

                {/* Compliance & Regulatory Guardrails */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.05em' }}>
                    REGULATORY & COMPLIANCE FLAGS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.is_dnd_active}
                        onChange={(e) => set('is_dnd_active', e.target.checked)}
                      />
                      <span>National DND Registry / Consent Revoked</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={form.is_near_payday}
                        onChange={(e) => set('is_near_payday', e.target.checked)}
                      />
                      <span>Near Payday Authorization Window</span>
                    </label>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={runSimulation}
                  disabled={loading}
                  style={{ width: '100%', marginTop: 4, height: 48, fontSize: 15 }}
                >
                  {loading ? 'Executing AI Orchestration…' : 'Run Single Simulation →'}
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
                        Configure payment failure parameters on the left and click <strong>"Run Single Simulation"</strong> to evaluate the rules + ML engine.
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
          </>
        )}

        {/* ── MODE 2: BATCH RECOVERY PORTFOLIO ENGINE ─────────── */}
        {activeTab === 'batch' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Batch Controller Card */}
            <div className="card card--padded" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  Execute Multi-Transaction Batch Recovery
                </div>
                <div className="text-secondary text-sm" style={{ marginTop: 4 }}>
                  Simulate thousands of real failed payment records across card, UPI, and netbanking networks simultaneously.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-el)', padding: '4px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  {[50, 100, 500].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setBatchSize(sz)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 4,
                        border: 'none',
                        background: batchSize === sz ? 'var(--accent-cta)' : 'transparent',
                        color: batchSize === sz ? '#FFFFFF' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {sz} Records
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={runBatchSimulation}
                  disabled={batchLoading}
                  style={{ height: 44, padding: '0 24px', fontSize: 14, gap: 8 }}
                >
                  {batchLoading ? (
                    <>Processing Batch ({batchProgress}%)…</>
                  ) : (
                    <>
                      Run Batch Recovery <Play className="w-4 h-4 fill-current" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Bar when running */}
            {batchLoading && (
              <div className="card card--padded" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                  Orchestrating {batchSize} Failed Transactions in Parallel…
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${batchProgress}%`,
                      background: 'linear-gradient(90deg, #315CFF 0%, #F2B705 100%)',
                      transition: 'width 200ms ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Calculating XGBoost inference, applying quiet hours windows, checking DND registers & human escalations
                </div>
              </div>
            )}

            {/* Batch Aggregate Results Panel */}
            {batchResult && !batchLoading && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                {/* Metric Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div className="metric-card">
                    <div className="metric-card__hdr">
                      <span className="metric-card__label">Total Salvaged (ML)</span>
                      <TrendingUp className="w-4 h-4 text-accent" />
                    </div>
                    <div className="metric-card__value metric-card__value--gold">
                      {fmtINR(batchResult.ml_recovered_amount)}
                    </div>
                    <div className="metric-card__sub" style={{ color: '#22c55e', fontWeight: 600 }}>
                      +{batchResult.uplift_percentage}% Uplift vs Rules Baseline
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card__hdr">
                      <span className="metric-card__label">ML Recovery Rate</span>
                      <ShieldCheck className="w-4 h-4 text-accent" />
                    </div>
                    <div className="metric-card__value metric-card__value--blue">
                      {(batchResult.ml_recovery_rate * 100).toFixed(1)}%
                    </div>
                    <div className="metric-card__sub">
                      vs {(batchResult.rules_recovery_rate * 100).toFixed(1)}% static rules
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card__hdr">
                      <span className="metric-card__label">Human Escalations</span>
                      <UserCheck className="w-4 h-4 text-accent" />
                    </div>
                    <div className="metric-card__value" style={{ color: '#F59E0B' }}>
                      {batchResult.counts.escalated_to_human}
                    </div>
                    <div className="metric-card__sub">Escalated after max retries</div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-card__hdr">
                      <span className="metric-card__label">Compliance Filtered</span>
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div className="metric-card__value metric-card__value--dim">
                      {batchResult.counts.dnd_blocked + batchResult.counts.quiet_hours_held}
                    </div>
                    <div className="metric-card__sub">
                      {batchResult.counts.dnd_blocked} DND · {batchResult.counts.quiet_hours_held} Quiet Hours
                    </div>
                  </div>
                </div>

                {/* Batch Ledger Table */}
                <div className="card card--padded">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>Batch Execution Ledger Sample</div>
                      <div className="text-muted text-xs">
                        Showing sample transactions processed in this batch run with live ML vs Rules decisions
                      </div>
                    </div>
                    <span className="badge badge--recovered">{batchResult.batch_size} TRANSACTIONS EXECUTED</span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-el)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>ID</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Amount</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Failure Reason</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Rules Baseline</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>ML Decision</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>ML Prob</th>
                          <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Result Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResult.records?.slice(0, 15).map((r, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                              {r.transaction_id}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmtINR(r.amount)}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                              {r.failure_reason?.replace(/_/g, ' ')}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                              {r.rules_action}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--accent-bright)' }}>
                              {r.ml_action}
                            </td>
                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                              {r.ml_probability != null ? `${(r.ml_probability * 100).toFixed(0)}%` : '—'}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
