'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { ArrowRight, TrendingUp, DollarSign, Activity, AlertOctagon } from 'lucide-react'

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0)
const ease = [0.22, 1, 0.36, 1]

/* ── Stickman pictogram ─────────────────────────────────────── */
function Stick({ color, size = 20 }) {
  return (
    <svg width={size} height={size * 1.65} viewBox="0 0 20 33" fill="none" style={{ display: 'block' }}>
      <circle cx="10" cy="5" r="4" fill={color} />
      <line x1="10" y1="9" x2="10" y2="22" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="10" y1="14" x2="3" y2="19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="10" y1="14" x2="17" y2="19" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="10" y1="22" x2="5" y2="31" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="10" y1="22" x2="15" y2="31" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function PictoCol({ label, count = 0, color, delay = 0, N = 1 }) {
  const figures = Math.max(1, Math.min(Math.round(count / N), 24))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap-reverse',
          justifyContent: 'center',
          gap: 4,
          width: 160,
          minHeight: 100,
          alignContent: 'flex-end',
        }}
      >
        {Array.from({ length: figures }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + Math.min(i * 0.055, 1.5), type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Stick color={color} size={19} />
          </motion.div>
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.03em' }}>{fmtNum(count)}</div>
        <div className="text-muted text-xs" style={{ marginTop: 3 }}>
          {label}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { isReady: backendIsReady } = useBackend()
  const [analytics, setAnalytics] = useState(null)
  const [txns, setTxns] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showVaulta, setShowVaulta] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [a, t] = await Promise.all([
        fetch('/api/analytics').then((r) => {
          if (!r.ok) throw r
          return r.json()
        }),
        fetch('/api/transactions?page=1&page_size=6').then((r) => {
          if (!r.ok) throw r
          return r.json()
        }),
      ])
      setAnalytics(a)
      setTxns(t.transactions || [])
      setDataLoaded(true)
    } catch {
      // Backend warming up; retry automatically
      setTimeout(loadData, 4000)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const f = analytics?.funnel || {}
  const rev = analytics?.revenue || {}
  const maxN = Math.max(f.total_failed || 1, f.retrying || 0, f.recovered || 0)
  const N = maxN > 200 ? 10 : maxN > 50 ? 5 : 1

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
        {/* Page header */}
        <div className="page-hdr">
          <div className="eyebrow">
            <span className="eyebrow__dot" /> REVENUE RECOVERY
          </div>
          <h1>Executive Dashboard</h1>
          {dataLoaded && (
            <p className="page-hdr__sub">{fmtNum(f.total_failed)} failed transactions tracked · live engine intelligence</p>
          )}
        </div>

        {dataLoaded && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            {/* KPI strip */}
            <div className="metric-grid">
              {[
                { label: 'Recovery rate', value: `${((f.recovery_rate || 0) * 100).toFixed(1)}%`, cls: 'metric-card__value--blue', sub: 'of transient failures' },
                { label: 'Revenue recovered', value: fmtINR(rev.recovered || 0), cls: 'metric-card__value--gold', sub: 'salvaged ARR' },
                { label: 'Active retries', value: fmtNum(f.retrying), cls: 'metric-card__value--blue', sub: 'in-flight cycles' },
                { label: 'Hard-failed', value: fmtNum(f.hard_failed), cls: 'metric-card__value--dim', sub: 'stolen/closed cards' },
              ].map((m) => (
                <div key={m.label} className="metric-card">
                  <div className="metric-card__label">{m.label}</div>
                  <div className={`metric-card__value ${m.cls}`}>{m.value}</div>
                  <div className="metric-card__sub">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Revenue at risk */}
            <div className="section">
              <div
                className="card card--padded"
                style={{
                  background: 'linear-gradient(135deg, rgba(49,92,255,0.06) 0%, rgba(5,7,13,0) 100%)',
                  borderColor: 'rgba(82,132,255,0.20)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    Revenue at risk
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 700, color: 'var(--status-gold)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {fmtINR(rev.at_risk || 0)}
                  </div>
                  <div className="text-muted text-sm" style={{ marginTop: 8 }}>
                    Transactions currently inside autonomous retry schedules — not yet recovered or permanently churned
                  </div>
                </div>
                <div style={{ fontSize: 44, opacity: 0.25 }}>💰</div>
              </div>
            </div>

            {/* Pictogram chart */}
            <div className="section">
              <div className="section-hdr">
                <span className="section-title">Recovery Funnel Distribution</span>
                <span className="text-muted text-xs">
                  1 figure = {N} transaction{N !== 1 ? 's' : ''}
                </span>
              </div>
              <div
                className="card card--padded"
                style={{
                  display: 'flex',
                  justifyContent: 'space-evenly',
                  alignItems: 'flex-end',
                  flexWrap: 'wrap',
                  gap: 32,
                  padding: '40px 24px',
                }}
              >
                <PictoCol label="Hard-failed (Discarded)" count={f.hard_failed || 0} color="var(--text-secondary)" delay={0} N={N} />
                <PictoCol label="In Retry Cycle" count={f.retrying || 0} color="var(--accent)" delay={0.2} N={N} />
                <PictoCol label="Successfully Recovered" count={f.recovered || 0} color="var(--status-gold)" delay={0.4} N={N} />
              </div>
            </div>

            {/* Recent activity */}
            <div className="section">
              <div className="section-hdr">
                <span className="section-title">Recent Recovery Activity</span>
                <Link href="/transactions" className="section-action">
                  View full feed →
                </Link>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Failure Reason</th>
                      <th>Retry Attempts</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.length === 0 && (
                      <tr>
                        <td colSpan={4}>
                          <div className="state-empty">No recent transactions</div>
                        </td>
                      </tr>
                    )}
                    {txns.map((txn) => (
                      <tr key={txn.transaction_id} onClick={() => (window.location.href = '/transactions')}>
                        <td>
                          <span className="text-mono">{txn.transaction_id.slice(0, 18)}…</span>
                          <div className="text-muted text-xs" style={{ marginTop: 3 }}>
                            {fmtINR(txn.amount)}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge--reason">{txn.failure_reason.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="text-muted text-sm">
                          {txn.attempt_count} / {txn.max_attempts}
                        </td>
                        <td>
                          <StatusBadge status={txn.status} />
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
    </div>
  )
}
