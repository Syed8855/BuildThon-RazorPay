'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatusBadge from '@/components/StatusBadge'
import OrchestratorLine from '@/components/OrchestratorLine'
import ShapBars from '@/components/ShapBars'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { REALISTIC_TRANSACTIONS } from '@/lib/merchantData'
import { exportTransactionsCSV } from '@/lib/exportCsv'
import { playFailSound, playScanSound, playRetrySound, playSuccessSound } from '@/lib/soundEffects'
import { X, Search, Play, RotateCcw, CheckCircle2, Download, Radio, Building2, ShieldCheck, Zap } from 'lucide-react'

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n ?? 0)
const ease = [0.22, 1, 0.36, 1]

const STATUS_FILTERS = ['all', 'retrying', 'recovered', 'failed']
const REASON_FILTERS = [
  'all',
  'insufficient_funds',
  'issuer_declined',
  'do_not_honor',
  'processing_error',
  'card_stolen',
]

/* ── Replay Recovery Modal ───────────────────────────────────── */
function ReplayModal({ txn, onClose }) {
  const [replayStage, setReplayStage] = useState('INITIATED')

  useEffect(() => {
    if (!txn) return
    setReplayStage('INITIATED')
    playScanSound()

    const t1 = setTimeout(() => { setReplayStage('FAILED'); playFailSound() }, 1100)
    const t2 = setTimeout(() => { setReplayStage('ANALYZING'); playScanSound() }, 2300)
    const t3 = setTimeout(() => { setReplayStage('RETRYING'); playRetrySound() }, 3600)
    const t4 = setTimeout(() => { setReplayStage('RECOVERED'); playSuccessSound() }, 5000)

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
    }
  }, [txn])

  if (!txn) return null

  const steps = [
    { id: 'INITIATED', label: 'Payment Initiated', sub: `${txn.merchant_name} · ${fmtINR(txn.amount)}` },
    { id: 'FAILED', label: 'Payment Failed', sub: txn.failure_reason?.replace(/_/g, ' ') },
    { id: 'ANALYZING', label: 'Recovery Engine', sub: 'Evaluating rules & ML model' },
    { id: 'RETRYING', label: 'Smart Retry', sub: `Attempt ${txn.attempt_count} scheduled` },
    { id: 'RECOVERED', label: 'Payment Recovered', sub: `+${fmtINR(txn.amount)} ARR Saved` },
  ]

  return (
    <AnimatePresence>
      <div className="drawer-overlay" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.3, ease }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(580px, 92vw)',
          background: 'var(--surface)',
          border: '1px solid rgba(82, 132, 255, 0.35)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-drawer), var(--shadow-glow)',
          zIndex: 400,
          padding: '28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div className="eyebrow"><span className="eyebrow__dot" /> RECOVERY REPLAY</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{txn.merchant_name}</div>
            <div className="text-mono text-xs text-muted" style={{ marginTop: 2 }}>{txn.transaction_id}</div>
          </div>
          <button className="btn btn-icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '24px 0' }}>
          {steps.map((step, idx) => {
            const isPast = steps.findIndex((s) => s.id === replayStage) >= idx
            const isCurrent = replayStage === step.id
            return (
              <div
                key={step.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isCurrent
                    ? 'rgba(82, 132, 255, 0.12)'
                    : isPast
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'transparent',
                  border: `1px solid ${
                    isCurrent
                      ? 'rgba(82, 132, 255, 0.35)'
                      : isPast
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'transparent'
                  }`,
                  transition: 'all 300ms ease',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isCurrent
                      ? 'var(--accent-cta)'
                      : isPast
                      ? 'rgba(82, 132, 255, 0.2)'
                      : 'rgba(255, 255, 255, 0.06)',
                    color: isPast || isCurrent ? '#FFFFFF' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isPast ? '#FFFFFF' : 'var(--text-muted)' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{step.sub}</div>
                </div>
                {isCurrent && (
                  <span className="badge badge--retrying" style={{ fontSize: 10 }}>
                    ACTIVE
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Status: <strong style={{ color: 'var(--text-primary)' }}>{replayStage}</strong>
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setReplayStage('INITIATED')
              playScanSound()
              setTimeout(() => { setReplayStage('FAILED'); playFailSound() }, 1100)
              setTimeout(() => { setReplayStage('ANALYZING'); playScanSound() }, 2300)
              setTimeout(() => { setReplayStage('RETRYING'); playRetrySound() }, 3600)
              setTimeout(() => { setReplayStage('RECOVERED'); playSuccessSound() }, 5000)
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay Again
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ── Transaction Audit Detail Drawer ─────────────────────────── */
function DetailDrawer({ txn, onClose, onReplay }) {
  if (!txn) return null
  const prob = txn.ml_result?.success_probability ?? null
  const probCls = prob === null ? '' : prob > 0.5 ? 'prob-val--high' : prob > 0.25 ? 'prob-val--mid' : 'prob-val--low'

  return (
    <AnimatePresence>
      <div className="drawer-overlay" onClick={onClose} />
      <motion.aside
        className="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.28, ease }}
      >
        <div className="drawer__header">
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
              }}
            >
              TRANSACTION DIAGNOSTICS
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              {txn.merchant_name}
            </div>
            <div className="text-mono text-xs text-muted" style={{ marginTop: 2 }}>{txn.transaction_id}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <StatusBadge status={txn.status} />
              <span className="text-muted text-xs font-semibold">{fmtINR(txn.amount)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={() => onReplay(txn)}
              style={{ height: 36, padding: '0 14px', fontSize: 12, gap: 6 }}
            >
              Replay <Play className="w-3.5 h-3.5 fill-current" />
            </button>
            <button className="btn btn-icon" onClick={onClose} style={{ flexShrink: 0 }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="drawer__body">
          <div>
            <div className="drawer__section-hdr">Orchestrator Decision</div>
            {txn.orchestrator_result ? (
              <OrchestratorLine decision={txn.orchestrator_result} />
            ) : (
              <div className="text-muted text-sm">Automated rule + ML pipeline resolution</div>
            )}
          </div>

          {prob !== null && (
            <div>
              <div className="drawer__section-hdr">ML Success Prediction</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <div className={`prob-val ${probCls}`}>{(prob * 100).toFixed(0)}%</div>
                <span className="text-muted text-sm">calculated probability</span>
              </div>
              <ShapBars contributions={txn.ml_result?.shap_contributions} />
            </div>
          )}

          {txn.customer_message && (
            <div>
              <div className="drawer__section-hdr">Automated Dunning Preview</div>
              <div
                className="card card--padded"
                style={{
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                "{txn.customer_message}"
              </div>
            </div>
          )}

          <div>
            <div className="drawer__section-hdr">Transaction Attributes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Merchant', txn.merchant_name],
                ['Category', txn.merchant_category],
                ['Failure reason', txn.failure_reason?.replace(/_/g, ' ')],
                ['Payment method', txn.payment_method],
                ['Customer segment', txn.customer_segment],
                ['Attempt count', `${txn.attempt_count} / ${txn.max_attempts}`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    background: 'var(--surface-el)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 500 }}>
                    {k}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main Transactions Feed Page
   ───────────────────────────────────────────────────────────── */
export default function TransactionsPage() {
  const { isReady: backendIsReady } = useBackend()
  const [txns, setTxns] = useState(REALISTIC_TRANSACTIONS)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showVaulta, setShowVaulta] = useState(true)
  const [selected, setSelected] = useState(null)
  const [replayTxn, setReplayTxn] = useState(null)
  const [statusF, setStatusF] = useState('all')
  const [reasonF, setReasonF] = useState('all')
  const [search, setSearch] = useState('')
  const [liveStream, setLiveStream] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDataLoaded(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Live real-time feed simulation streamer
  useEffect(() => {
    if (!liveStream) return
    const interval = setInterval(() => {
      const newTxn = {
        transaction_id: `txn_live_${Math.random().toString(36).substring(2, 9)}`,
        merchant_name: 'Netflix India',
        merchant_category: 'subscription',
        amount: 649,
        status: Math.random() > 0.3 ? 'recovered' : 'retrying',
        failure_reason: 'insufficient_funds',
        payment_method: 'card',
        customer_segment: 'returning',
        attempt_count: 2,
        max_attempts: 4,
        ml_result: { success_probability: 0.88 },
      }
      setTxns((prev) => [newTxn, ...prev])
      playSuccessSound()
    }, 4500)

    return () => clearInterval(interval)
  }, [liveStream])

  const filtered = txns.filter((t) => {
    if (statusF !== 'all' && t.status !== statusF) return false
    if (reasonF !== 'all' && t.failure_reason !== reasonF) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.transaction_id.toLowerCase().includes(q) ||
        (t.merchant_name && t.merchant_name.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="page" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-glow-bg" />

      <AnimatePresence>
        {showVaulta && !dataLoaded && (
          <VaultaLoadingScreen
            isReady={dataLoaded || backendIsReady}
            onReadyTransitionComplete={() => setShowVaulta(false)}
          />
        )}
      </AnimatePresence>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <div className="eyebrow" style={{ background: 'rgba(82, 132, 255, 0.12)', border: '1px solid rgba(82, 132, 255, 0.25)', boxShadow: '0 0 16px rgba(49, 92, 255, 0.18)' }}>
              <span className="eyebrow__dot" /> TRANSACTIONS AUDIT
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10 }}>Transaction Feed</h1>
            {dataLoaded && (
              <p className="page-hdr__sub" style={{ margin: 0 }}>
                {txns.length} payment recoveries analyzed · click any entry for full AI diagnostics or click Replay
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className={`btn ${liveStream ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setLiveStream(!liveStream)}
              style={{ height: 40, padding: '0 16px', fontSize: 13, gap: 6 }}
            >
              <Radio className={`w-3.5 h-3.5 ${liveStream ? 'animate-pulse' : ''}`} />
              {liveStream ? 'Live Stream Active' : 'Enable Live Stream'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => exportTransactionsCSV(filtered)}
              style={{ height: 40, padding: '0 16px', fontSize: 13, gap: 6 }}
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {dataLoaded && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            {/* Status Filters */}
            <div className="filter-bar">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f}
                  className={`filter-pill${statusF === f ? ' active' : ''}`}
                  onClick={() => setStatusF(f)}
                >
                  {f === 'all' ? 'All Statuses' : f}
                </button>
              ))}
              <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <input
                  className="search-input"
                  placeholder="Search merchant or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Failure Reason Filters */}
            <div className="filter-bar" style={{ marginBottom: 24 }}>
              {REASON_FILTERS.map((f) => (
                <button
                  key={f}
                  className={`filter-pill${reasonF === f ? ' active' : ''}`}
                  onClick={() => setReasonF(f)}
                  style={{ fontSize: 11 }}
                >
                  {f === 'all' ? 'All Failure Reasons' : f.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Premium Card-Row Transaction List */}
            <div className="section">
              <div className="section-hdr">
                <span className="section-title">{filtered.length} matched transactions</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.length === 0 && (
                  <div className="card card--padded state-empty">No transactions matching filter criteria</div>
                )}
                {filtered.map((txn) => {
                  const prob = txn.ml_result?.success_probability
                  const isSel = selected?.transaction_id === txn.transaction_id
                  return (
                    <motion.div
                      key={txn.transaction_id}
                      onClick={() => setSelected(txn)}
                      whileHover={{ scale: 1.006, y: -2 }}
                      transition={{ duration: 0.15, ease }}
                      className={`card ${isSel ? 'card--glow' : ''}`}
                      style={{
                        padding: '18px 22px',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(200px, 1.6fr) 1.2fr 1fr 1fr 1fr auto',
                        alignItems: 'center',
                        gap: 16,
                        cursor: 'pointer',
                        borderColor: isSel ? 'var(--accent)' : 'var(--border)',
                        background: isSel ? 'rgba(82, 132, 255, 0.06)' : 'var(--surface)',
                      }}
                    >
                      {/* Merchant & Amount */}
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {txn.merchant_name || 'Razorpay Merchant'}
                        </div>
                        <div className="text-mono text-xs text-muted" style={{ marginTop: 2 }}>
                          {txn.transaction_id} · <strong>{fmtINR(txn.amount)}</strong>
                        </div>
                      </div>

                      {/* Failure Reason */}
                      <div>
                        <span className="badge badge--reason">{txn.failure_reason.replace(/_/g, ' ')}</span>
                      </div>

                      {/* Method */}
                      <div className="text-muted text-sm" style={{ textTransform: 'capitalize', fontWeight: 500 }}>
                        {txn.payment_method}
                      </div>

                      {/* Probability */}
                      <div>
                        {prob != null ? (
                          <div className="prob-bar">
                            <div className="prob-bar__track">
                              <div className="prob-bar__fill" style={{ width: `${prob * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted font-semibold">{(prob * 100).toFixed(0)}%</span>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <StatusBadge status={txn.status} />
                      </div>

                      {/* Replay CTA */}
                      <button
                        className="btn btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation()
                          setReplayTxn(txn)
                        }}
                        style={{ height: 36, padding: '0 14px', fontSize: 12, gap: 4 }}
                      >
                        Replay <Play className="w-3 h-3 fill-current" />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {selected && (
        <DetailDrawer
          txn={selected}
          onClose={() => setSelected(null)}
          onReplay={(t) => setReplayTxn(t)}
        />
      )}

      {replayTxn && (
        <ReplayModal txn={replayTxn} onClose={() => setReplayTxn(null)} />
      )}
    </div>
  )
}
