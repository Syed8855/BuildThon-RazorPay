'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import StatusBadge from '@/components/StatusBadge'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'
import { REALISTIC_TRANSACTIONS } from '@/lib/merchantData'
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
  const [analytics, setAnalytics] = useState(null)
  const [txns, setTxns] = useState(REALISTIC_TRANSACTIONS)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showVaulta, setShowVaulta] = useState(true)
  const [timeRange, setTimeRange] = useState('30D')
  const [activeKpiDetail, setActiveKpiDetail] = useState(null)
  const [liveStream, setLiveStream] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const a = await fetch('/api/analytics').then((r) => {
        if (!r.ok) throw r
        return r.json()
      })
      setAnalytics(a)
      setDataLoaded(true)
    } catch {
      setTimeout(loadData, 4000)
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
      id: 'revenue',
      label: 'Total Salvaged ARR',
      value: fmtINR(Math.round((rev.recovered || 148250) * multiplier)),
      cls: 'metric-card__value--gold',
      sub: '✦ +14.2% vs last month',
      detail: 'Cumulative recurring revenue salvaged by autonomous ML retry schedules, preventing involuntary churn.',
    },
    {
      id: 'rate',
      label: 'Autonomous Recovery Rate',
      value: `${((f.recovery_rate || 0.864) * 100).toFixed(1)}%`,
      cls: 'metric-card__value--blue',
      sub: 'of transient payment declines',
      detail: 'Percentage of non-hard-failed transactions recovered before reaching maximum retry thresholds.',
    },
    {
      id: 'payments',
      label: 'Payments Recovered',
      value: fmtNum(Math.round(184 * multiplier)),
      cls: 'metric-card__value--blue',
      sub: 'confirmed authorizations',
      detail: 'Total individual customer invoices converted from initial payment decline to confirmed bank authorization.',
    },
    {
      id: 'risk',
      label: 'Revenue at Risk',
      value: fmtINR(Math.round((rev.at_risk || 12430) * multiplier)),
      cls: 'metric-card__value--dim',
      sub: '14 active retry schedules',
      detail: 'Outstanding revenue currently in-flight within optimal retry windows.',
    },
  ]

  return (
    <div className="page">
      <AnimatePresence>
        {showVaulta && !dataLoaded && (
          <VaultaLoadingScreen
            isReady={dataLoaded || backendIsReady}
            onReadyTransitionComplete={() => setShowVaulta(false)}
          />
        )}
      </AnimatePresence>

      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow__dot" /> FINANCIAL COMMAND CENTER
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 8 }}>
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
            >
              <Radio className={`w-3.5 h-3.5 ${liveStream ? 'animate-pulse' : ''}`} />
              {liveStream ? 'Live Stream Active' : 'Enable Live Stream'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => exportSummaryCSV(analytics || {})}
              style={{ height: 40, padding: '0 16px', fontSize: 13, gap: 6 }}
            >
              <Download className="w-3.5 h-3.5" /> Export Report CSV
            </button>

            <div className="filter-bar" style={{ margin: 0 }}>
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
                        padding: '12px 14px',
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

            {/* Financial Insights Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 32 }}>
              {[
                { title: '✦ Payday Window Alignment', desc: 'Recovery probability increases by 3.2x when retrying within 48h of payday (1st–5th of month).' },
                { title: '◈ Zero Chargeback Guardrail', desc: 'Hard-fail rules blocked 28 stolen/closed card retries, avoiding $4,200 in dispute fees.' },
                { title: '📈 Cash-Flow Acceleration', desc: 'Automated UPI AutoPay retries recovered ₹18,400 in under 3 hours.' },
              ].map((insight) => (
                <div
                  key={insight.title}
                  className="card card--padded"
                  style={{
                    background: 'rgba(82, 132, 255, 0.05)',
                    borderColor: 'rgba(82, 132, 255, 0.18)',
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-bright)', marginBottom: 4 }}>
                    {insight.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {insight.desc}
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
