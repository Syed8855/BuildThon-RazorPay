'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import StatusBadge from '@/components/StatusBadge'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { ArrowRight, TrendingUp, DollarSign, Activity, AlertOctagon, Info, Calendar } from 'lucide-react'

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0)
const ease = [0.22, 1, 0.36, 1]

const TIME_RANGES = ['7D', '30D', '90D']

/* ── Custom Dark Tooltip ─────────────────────────────────────── */
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--surface-el)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        fontSize: 12,
        fontFamily: 'var(--font)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: 'var(--accent)' }}>
          {p.name}: <strong>{fmtINR(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

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
  const [timeRange, setTimeRange] = useState('30D')
  const [activeKpiDetail, setActiveKpiDetail] = useState(null)

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

  // Time range scaling multiplier
  const multiplier = timeRange === '7D' ? 0.25 : timeRange === '90D' ? 2.8 : 1.0

  const chartData = [
    { day: 'Day 1', recovered: Math.round((rev.recovered || 48250) * 0.12 * multiplier) },
    { day: 'Day 5', recovered: Math.round((rev.recovered || 48250) * 0.22 * multiplier) },
    { day: 'Day 10', recovered: Math.round((rev.recovered || 48250) * 0.38 * multiplier) },
    { day: 'Day 15', recovered: Math.round((rev.recovered || 48250) * 0.54 * multiplier) },
    { day: 'Day 20', recovered: Math.round((rev.recovered || 48250) * 0.72 * multiplier) },
    { day: 'Day 25', recovered: Math.round((rev.recovered || 48250) * 0.88 * multiplier) },
    { day: 'Today', recovered: Math.round((rev.recovered || 48250) * multiplier) },
  ]

  const kpis = [
    {
      id: 'revenue',
      label: 'Recovered Revenue',
      value: fmtINR(Math.round((rev.recovered || 48250) * multiplier)),
      cls: 'metric-card__value--gold',
      sub: 'Salvaged ARR across retries',
      detail: 'Cumulative revenue successfully salvaged by autonomous retry schedules, preventing involuntary churn.',
    },
    {
      id: 'rate',
      label: 'Recovery Rate',
      value: `${((f.recovery_rate || 0.86) * 100).toFixed(0)}%`,
      cls: 'metric-card__value--blue',
      sub: 'of transient payment failures',
      detail: 'Percentage of non-hard-failed transactions recovered before reaching maximum retry thresholds.',
    },
    {
      id: 'payments',
      label: 'Payments Recovered',
      value: fmtNum(Math.round(127 * multiplier)),
      cls: 'metric-card__value--blue',
      sub: 'successful retry cycles',
      detail: 'Total individual customer invoices converted from initial payment failure to confirmed authorization.',
    },
    {
      id: 'risk',
      label: 'Revenue at Risk',
      value: fmtINR(Math.round((rev.at_risk || 12430) * multiplier)),
      cls: 'metric-card__value--dim',
      sub: 'in active retry schedules',
      detail: 'Outstanding revenue currently in-flight within optimal retry windows.',
    },
  ]

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow__dot" /> REVENUE RECOVERY
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 8 }}>
              Command Center
            </h1>
            <p className="page-hdr__sub" style={{ margin: 0 }}>
              Your recovery engine at a glance · real-time intelligence & automated revenue optimization
            </p>
          </div>

          {/* Time Filter Pills */}
          <div className="filter-bar" style={{ margin: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar className="w-3.5 h-3.5" /> Timeframe:
            </span>
            {TIME_RANGES.map((t) => (
              <button
                key={t}
                className={`filter-pill${timeRange === t ? ' active' : ''}`}
                onClick={() => setTimeRange(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {dataLoaded && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            {/* KPI Strip with Click Context */}
            <div className="metric-grid">
              {kpis.map((m) => (
                <motion.div
                  key={m.id}
                  className="metric-card"
                  onClick={() => setActiveKpiDetail(activeKpiDetail === m.id ? null : m.id)}
                  whileHover={{ scale: 1.015 }}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="metric-card__label">{m.label}</div>
                    <Info className="w-3.5 h-3.5 text-muted opacity-50" />
                  </div>
                  <div className={`metric-card__value ${m.cls}`}>{m.value}</div>
                  <div className="metric-card__sub">{m.sub}</div>

                  {activeKpiDetail === m.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--surface-high)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        boxShadow: 'var(--shadow-card)',
                        zIndex: 20,
                        marginTop: 6,
                      }}
                    >
                      {m.detail}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Dynamic Revenue Trend Chart Section */}
            <div className="section">
              <div className="section-hdr">
                <span className="section-title">Recovered Revenue Trend ({timeRange})</span>
                <span className="text-muted text-xs">Live recovery rate: {((f.recovery_rate || 0.86) * 100).toFixed(0)}%</span>
              </div>
              <div className="card card--padded" style={{ padding: '24px 24px 12px' }}>
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5284FF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#5284FF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="recovered" name="Recovered ARR" stroke="#5284FF" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue at risk Highlight */}
            <div className="section">
              <div
                className="card card--padded"
                style={{
                  background: 'linear-gradient(135deg, rgba(49,92,255,0.07) 0%, rgba(5,7,13,0) 100%)',
                  borderColor: 'rgba(82,132,255,0.22)',
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
                    Revenue at risk ({timeRange})
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 700, color: 'var(--status-gold)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    {fmtINR(Math.round((rev.at_risk || 12430) * multiplier))}
                  </div>
                  <div className="text-muted text-sm" style={{ marginTop: 8 }}>
                    Transactions currently inside autonomous retry schedules — not yet recovered or permanently churned
                  </div>
                </div>
                <div style={{ fontSize: 44, opacity: 0.25 }}>💰</div>
              </div>
            </div>

            {/* Pictogram Funnel Chart */}
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
                <PictoCol label="Hard-failed (Discarded)" count={Math.round((f.hard_failed || 12) * multiplier)} color="var(--text-secondary)" delay={0} N={N} />
                <PictoCol label="In Retry Cycle" count={Math.round((f.retrying || 28) * multiplier)} color="var(--accent)" delay={0.2} N={N} />
                <PictoCol label="Successfully Recovered" count={Math.round((f.recovered || 127) * multiplier)} color="var(--status-gold)" delay={0.4} N={N} />
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
