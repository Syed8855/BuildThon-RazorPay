'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import StatusBadge from '@/components/StatusBadge'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { REALISTIC_TRANSACTIONS, MOCK_ANALYTICS_SUMMARY } from '@/lib/merchantData'
import { exportSummaryCSV } from '@/lib/exportCsv'
import { playSuccessSound } from '@/lib/soundEffects'
import { ArrowRight, TrendingUp, DollarSign, Activity, AlertOctagon, Info, Calendar, Download, Radio, ShieldCheck, Zap, Sparkles, Building2 } from 'lucide-react'

const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n ?? 0)
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0)
const ease = [0.22, 1, 0.36, 1]

const TIME_RANGES = ['7D', '30D', '90D']

/* ── Dark Specular Tooltip ───────────────────────────────────── */
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--surface-el)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 16px',
        fontSize: 12,
        fontFamily: 'var(--font)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>
          {p.name}: <strong>{fmtINR(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { isReady: backendIsReady } = useBackend()
  const [analytics, setAnalytics] = useState(MOCK_ANALYTICS_SUMMARY)
  const [txns, setTxns] = useState(REALISTIC_TRANSACTIONS)
  const [dataLoaded, setDataLoaded] = useState(true)
  const [showVaulta, setShowVaulta] = useState(false)
  const [timeRange, setTimeRange] = useState('30D')
  const [activeKpiDetail, setActiveKpiDetail] = useState(null)
  const [liveStream, setLiveStream] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const a = await fetch('/api/analytics').then((r) => {
        if (!r.ok) throw r
        return r.json()
      })
      if (a && a.funnel) {
        setAnalytics(a)
      }
      setDataLoaded(true)
    } catch {
      // Keep rich mock data as fallback
      setDataLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Live streaming streamer
  useEffect(() => {
    if (!liveStream) return
    const interval = setInterval(() => {
      const newTxn = {
        transaction_id: `txn_live_${Math.random().toString(36).substring(2, 9)}`,
        merchant_name: 'Netflix India',
        merchant_category: 'subscription',
        amount: 649,
        status: 'recovered',
        failure_reason: 'insufficient_funds',
        payment_method: 'card',
        attempt_count: 2,
        max_attempts: 4,
        date: 'Just now',
      }
      setTxns((prev) => [newTxn, ...prev.slice(0, 7)])
      playSuccessSound()
    }, 4500)

    return () => clearInterval(interval)
  }, [liveStream])

  const f = analytics?.funnel || {}
  const rev = analytics?.revenue || {}
  const multiplier = timeRange === '7D' ? 0.25 : timeRange === '90D' ? 2.8 : 1.0

  const chartData = [
    { day: 'Day 1', recovered: Math.round((rev.recovered || 148250) * 0.14 * multiplier) },
    { day: 'Day 5', recovered: Math.round((rev.recovered || 148250) * 0.28 * multiplier) },
    { day: 'Day 10', recovered: Math.round((rev.recovered || 148250) * 0.44 * multiplier) },
    { day: 'Day 15', recovered: Math.round((rev.recovered || 148250) * 0.62 * multiplier) },
    { day: 'Day 20', recovered: Math.round((rev.recovered || 148250) * 0.78 * multiplier) },
    { day: 'Day 25', recovered: Math.round((rev.recovered || 148250) * 0.90 * multiplier) },
    { day: 'Today', recovered: Math.round((rev.recovered || 148250) * multiplier) },
  ]

  const kpis = [
    {
      id: 'arr',
      label: 'Autonomous Recovered ARR',
      value: fmtINR(Math.round((rev.recovered || 1119500) * multiplier)),
      cls: 'metric-card__value--gold',
      sub: `+${((f.recovery_rate || 0.864) * 100).toFixed(1)}% recovery efficiency`,
      detail: 'Cumulative gross revenue recovered strictly via autonomous smart retries without human collector intervention.',
    },
    {
      id: 'rate',
      label: 'Autonomous Recovery Rate',
      value: `${((f.recovery_rate || 0.864) * 100).toFixed(1)}%`,
      cls: 'metric-card__value--blue',
      sub: `${f.recovered || 944} of ${f.eligible_for_retry || 1092} eligible salvages`,
      detail: 'Percentage of retry-eligible payment failures successfully authorized across all active payment methods.',
    },
    {
      id: 'payments',
      label: 'Payments Recovered',
      value: fmtNum(Math.round((f.recovered || 944) * multiplier)),
      cls: 'metric-card__value--blue',
      sub: 'confirmed authorizations',
      detail: 'Total individual customer invoices converted from initial payment decline to confirmed bank authorization.',
    },
    {
      id: 'risk',
      label: 'Revenue at Risk',
      value: fmtINR(Math.round((rev.at_risk || 176200) * multiplier)),
      cls: 'metric-card__value--dim',
      sub: '14 active retry schedules',
      detail: 'Outstanding revenue currently in-flight within optimal retry windows.',
    },
  ]

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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <div className="eyebrow" style={{ background: 'rgba(82, 132, 255, 0.12)', border: '1px solid rgba(82, 132, 255, 0.25)', boxShadow: '0 0 16px rgba(49, 92, 255, 0.18)' }}>
              <span className="eyebrow__dot" /> FINANCIAL COMMAND CENTER
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10 }}>
              Executive Dashboard
            </h1>
            <p className="page-hdr__sub" style={{ margin: 0 }}>
              Real-time payment recovery intelligence · automated cash-flow optimization & fraud guardrails
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className={`btn ${liveStream ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setLiveStream(!liveStream)}
              style={{ height: 40, padding: '0 16px', fontSize: 13, gap: 6 }}
              aria-label={liveStream ? 'Disable live telemetry stream' : 'Enable live telemetry stream'}
            >
              <Radio className={`w-3.5 h-3.5 ${liveStream ? 'animate-pulse' : ''}`} />
              {liveStream ? 'Live Stream Active' : 'Enable Live Stream'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => exportSummaryCSV(analytics || {})}
              style={{ height: 40, padding: '0 16px', fontSize: 13, gap: 6 }}
              aria-label="Export executive summary as CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export Report CSV
            </button>

            <div className="filter-bar" style={{ margin: 0 }}>
              {TIME_RANGES.map((t) => (
                <button
                  key={t}
                  className={`filter-pill${timeRange === t ? ' active' : ''}`}
                  onClick={() => setTimeRange(t)}
                  aria-label={`Filter by ${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {dataLoaded && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            {/* KPI Strip */}
            <div className="metric-grid">
              {kpis.map((m) => (
                <motion.div
                  key={m.id}
                  className="metric-card"
                  onClick={() => setActiveKpiDetail(activeKpiDetail === m.id ? null : m.id)}
                  whileHover={{ scale: 1.015, y: -2 }}
                  style={{ cursor: 'pointer', position: 'relative' }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${m.label}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="metric-card__label">{m.label}</div>
                    <div
                      style={{
                        padding: '2px 4px',
                        borderRadius: '4px',
                        color: 'var(--text-muted)',
                      }}
                      title="Click for explanation"
                    >
                      <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                    </div>
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
                        background: 'rgba(16, 22, 38, 0.98)',
                        border: '1px solid rgba(82, 132, 255, 0.35)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 16px',
                        fontSize: 12.5,
                        color: 'var(--text-primary)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 20px rgba(49,92,255,0.2)',
                        zIndex: 20,
                        marginTop: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--accent-bright)', marginBottom: 4 }}>
                        ✦ Metric Attribution:
                      </div>
                      {m.detail}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Financial Insights Strip — Elevated Styling */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
              {[
                { title: '✦ Payday Window Alignment', icon: '⚡', desc: 'Recovery probability increases by 3.2x when retrying within 48h of payday (1st–5th of month).' },
                { title: '◈ Zero Chargeback Guardrail', icon: '🛡️', desc: 'Hard-fail rules blocked 28 stolen/closed card retries, avoiding $4,200 in dispute fees.' },
                { title: '📈 Cash-Flow Acceleration', icon: '🚀', desc: 'Automated UPI AutoPay retries recovered ₹18,400 in under 3 hours.' },
              ].map((insight) => (
                <div
                  key={insight.title}
                  className="card card--padded card--hover"
                  style={{
                    background: 'linear-gradient(180deg, rgba(16, 22, 38, 0.85) 0%, rgba(11, 16, 29, 0.95) 100%)',
                    border: '1px solid rgba(82, 132, 255, 0.24)',
                    boxShadow: 'var(--shadow-card)',
                    padding: '20px 22px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{insight.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                        {insight.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                      {insight.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Revenue Trend Chart */}
            <div className="section">
              <div className="section-hdr">
                <span className="section-title">Recovered Revenue Growth Trend ({timeRange})</span>
                <span className="text-muted text-xs">Autonomous auth rate: {((f.recovery_rate || 0.864) * 100).toFixed(1)}%</span>
              </div>
              <div className="card card--padded" style={{ padding: '26px 26px 14px' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5284FF" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#5284FF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="recovered" name="Recovered ARR" stroke="#5284FF" strokeWidth={3.5} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Merchant Activity Feed */}
            <div className="section">
              <div className="section-hdr">
                <span className="section-title">Recent Recovered Merchant Activity</span>
                <Link href="/transactions" className="section-action">
                  View full feed →
                </Link>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Merchant</th>
                      <th>Transaction ID</th>
                      <th>Failure Reason</th>
                      <th>Attempts</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((txn) => (
                      <tr key={txn.transaction_id} onClick={() => (window.location.href = '/transactions')}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Building2 className="w-4 h-4 text-accent flex-shrink-0" />
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{txn.merchant_name}</div>
                              <div className="text-muted text-xs">{txn.merchant_category}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-mono">{txn.transaction_id}</span>
                          <div className="text-muted text-xs" style={{ marginTop: 2 }}>
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
