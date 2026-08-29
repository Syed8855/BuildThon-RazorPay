'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatusBadge from '@/components/StatusBadge'
import OrchestratorLine from '@/components/OrchestratorLine'
import ShapBars from '@/components/ShapBars'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { X, Search } from 'lucide-react'

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)
const ease = [0.22, 1, 0.36, 1]

const STATUS_FILTERS = ['all', 'retrying', 'recovered', 'failed', 'churned']
const REASON_FILTERS = [
  'all',
  'insufficient_funds',
  'issuer_declined',
  'do_not_honor',
  'processing_error',
  'card_expired',
  'card_stolen',
]

function DetailDrawer({ txn, onClose }) {
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
              TRANSACTION AUDIT
            </div>
            <div className="text-mono" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              {txn.transaction_id}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <StatusBadge status={txn.status} />
              <span className="text-muted text-xs">{fmtINR(txn.amount)}</span>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} style={{ flexShrink: 0 }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="drawer__body">
          {/* Orchestrator Decision */}
          <div>
            <div className="drawer__section-hdr">Orchestrator Decision</div>
            {txn.orchestrator_result ? (
              <OrchestratorLine decision={txn.orchestrator_result} />
            ) : (
              <div className="text-muted text-sm">Rule pipeline default</div>
            )}
          </div>

          {/* ML Output */}
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

          {/* Attempt Timeline */}
          {txn.attempt_history?.length > 0 && (
            <div>
              <div className="drawer__section-hdr">Attempt Timeline</div>
              <div className="timeline">
                {txn.attempt_history.map((a, i) => (
                  <div key={i} className="tl-item">
                    <div
                      className={`tl-dot tl-dot--${
                        a.outcome === 'success' ? 'success' : a.outcome === 'failed' ? 'fail' : 'pending'
                      }`}
                    >
                      {a.attempt_number}
                    </div>
                    <div>
                      <div className="tl-label">
                        Attempt {a.attempt_number} — {a.outcome}
                      </div>
                      <div className="tl-meta">
                        {a.timestamp && new Date(a.timestamp).toLocaleString('en-IN')}
                        {a.failure_reason && ` · ${a.failure_reason.replace(/_/g, ' ')}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Message */}
          {txn.customer_message && (
            <div>
              <div className="drawer__section-hdr">Dunning Communication Preview</div>
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

          {/* Metadata */}
          <div>
            <div className="drawer__section-hdr">Transaction Attributes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                ['Failure reason', txn.failure_reason?.replace(/_/g, ' ')],
                ['Payment method', txn.payment_method],
                ['Merchant category', txn.merchant_category?.replace(/_/g, ' ')],
                ['Customer segment', txn.customer_segment],
                ['Attempt count', `${txn.attempt_count} / ${txn.max_attempts}`],
                ['Is recurring', txn.is_recurring ? 'Yes' : 'No'],
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
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

export default function TransactionsPage() {
  const { isReady: backendIsReady } = useBackend()
  const [txns, setTxns] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showVaulta, setShowVaulta] = useState(true)
  const [selected, setSelected] = useState(null)
  const [statusF, setStatusF] = useState('all')
  const [reasonF, setReasonF] = useState('all')
  const [search, setSearch] = useState('')
  const PAGE_SIZE = 50

  const loadTransactions = useCallback(async () => {
    try {
      const r = await fetch(`/api/transactions?page_size=${PAGE_SIZE}`)
      if (!r.ok) throw r
      const d = await r.json()
      setTxns(d.transactions || [])
      setDataLoaded(true)
    } catch {
      setTimeout(loadTransactions, 4000)
    }
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const filtered = txns.filter((t) => {
    if (statusF !== 'all' && t.status !== statusF) return false
    if (reasonF !== 'all' && t.failure_reason !== reasonF) return false
    if (search && !t.transaction_id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="page">
      {/* 3D Vaulta Loading Experience if backend is warming up */}
      <AnimatePresence>
        {showVaulta && !dataLoaded && (
          <VaultaLoadingScreen
            isReady={dataLoaded || backendIsReady}
            onReadyTransitionComplete={() => setShowVaulta(false)}
          />
        )}
      </AnimatePresence>

      <div className="container">
        <div className="page-hdr">
          <div className="eyebrow">
            <span className="eyebrow__dot" /> TRANSACTIONS AUDIT
          </div>
          <h1>Transaction Feed</h1>
          {dataLoaded && (
            <p className="page-hdr__sub">{txns.length} payment recoveries analyzed · click any entry for full AI diagnostics</p>
          )}
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
                  placeholder="Search transaction ID…"
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

            {/* Transaction Data Table */}
            <div className="section">
              <div className="section-hdr">
                <span className="section-title">{filtered.length} matched transactions</span>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Failure Reason</th>
                      <th>Method</th>
                      <th>ML Probability</th>
                      <th>Attempts</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="state-empty">No transactions matching filter criteria</div>
                        </td>
                      </tr>
                    )}
                    {filtered.map((txn) => {
                      const prob = txn.ml_result?.success_probability
                      return (
                        <tr
                          key={txn.transaction_id}
                          className={selected?.transaction_id === txn.transaction_id ? 'row-active' : ''}
                          onClick={() => setSelected(txn)}
                        >
                          <td>
                            <div className="text-mono">{txn.transaction_id.slice(0, 18)}…</div>
                            <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                              {fmtINR(txn.amount)}
                            </div>
                          </td>
                          <td>
                            <span className="badge badge--reason">{txn.failure_reason.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="text-muted text-sm">{txn.payment_method}</td>
                          <td>
                            {prob != null ? (
                              <div className="prob-bar">
                                <div className="prob-bar__track">
                                  <div className="prob-bar__fill" style={{ width: `${prob * 100}%` }} />
                                </div>
                                <span className="text-xs text-muted">{(prob * 100).toFixed(0)}%</span>
                              </div>
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>
                          <td className="text-muted text-sm">
                            {txn.attempt_count} / {txn.max_attempts}
                          </td>
                          <td>
                            <StatusBadge status={txn.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {selected && <DetailDrawer txn={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
