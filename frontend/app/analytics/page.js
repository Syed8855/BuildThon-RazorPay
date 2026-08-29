'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import VaultaLoadingScreen from '@/components/loading/VaultaLoadingScreen'
import { useBackend } from '@/context/BackendContext'

const ease = [0.22, 1, 0.36, 1]
const fmtINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

const C_BLUE = '#5284FF'
const C_GOLD = '#F2B705'
const C_DIM = '#737A8C'

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
        <div key={p.dataKey} style={{ color: 'var(--text-secondary)' }}>
          {p.name}:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {typeof p.value === 'number' && p.value < 10 ? p.value.toFixed(1) : p.value}
          </strong>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { isReady: backendIsReady } = useBackend()
  const [data, setData] = useState(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showVaulta, setShowVaulta] = useState(true)

  const loadAnalytics = useCallback(async () => {
    try {
      const d = await fetch('/api/analytics').then((r) => {
        if (!r.ok) throw r
        return r.json()
      })
      setData(d)
      setDataLoaded(true)
    } catch {
      setTimeout(loadAnalytics, 4000)
    }
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const { funnel = {}, revenue = {}, recovery_by_reason = {}, recovery_by_attempt = [], global_feature_importance = [] } = data || {}

  const funnelData = [
    { name: 'Total Failed', value: funnel.total_failed || 0, fill: C_DIM },
    { name: 'Hard-Failed', value: funnel.hard_failed || 0, fill: '#4A4A5E' },
    { name: 'In Retry Cycle', value: funnel.retrying || 0, fill: C_BLUE },
    { name: 'Recovered', value: funnel.recovered || 0, fill: C_GOLD },
    { name: 'Churned', value: funnel.churned || 0, fill: '#3A3A4E' },
  ]

  const reasonData = Object.entries(recovery_by_reason)
    .map(([r, rate]) => ({ name: r.replace(/_/g, ' '), rate: parseFloat((rate * 100).toFixed(1)) }))
    .sort((a, b) => b.rate - a.rate)

  const attemptData = recovery_by_attempt.map((r) => ({
    name: `Attempt ${r.attempt_number}`,
    rate: parseFloat((r.recovery_rate * 100).toFixed(1)),
    n: r.n_attempts,
  }))

  const fiData = global_feature_importance.slice(0, 8).map((f) => ({
    name: f.feature.replace(/_/g, ' '),
    val: parseFloat((f.importance * 100).toFixed(1)),
  }))

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
            <span className="eyebrow__dot" /> INTELLIGENCE & ANALYTICS
          </div>
          <h1>Recovery Analytics</h1>
          {dataLoaded && (
            <p className="page-hdr__sub">Comprehensive pipeline observability · unified ML & rules performance metrics</p>
          )}
        </div>

        {dataLoaded && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            {/* Executive KPIs */}
            <div className="metric-grid">
              {[
                { label: 'Overall Recovery rate', value: `${((funnel.recovery_rate || 0) * 100).toFixed(1)}%`, cls: 'metric-card__value--blue' },
                { label: 'Recovered Revenue', value: fmtINR(revenue.recovered || 0), cls: 'metric-card__value--gold' },
                { label: 'In-Flight Risk', value: fmtINR(revenue.at_risk || 0), cls: '' },
                { label: 'Permanently Churned', value: funnel.churned || 0, cls: 'metric-card__value--dim' },
              ].map((m) => (
                <div key={m.label} className="metric-card">
                  <div className="metric-card__label">{m.label}</div>
                  <div className={`metric-card__value ${m.cls}`}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Recovery Funnel Chart */}
            <div className="section">
              <div className="section-hdr">
                <span className="section-title">End-to-End Recovery Funnel</span>
              </div>
              <div className="card card--padded" style={{ padding: '24px 24px 8px' }}>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 12, fill: C_DIM }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      {funnelData.map((e) => (
                        <Cell key={e.name} fill={e.fill} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        style={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font)' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {/* Recovery by Failure Reason */}
              <div className="section">
                <div className="section-hdr">
                  <span className="section-title">Recovery Rate by Failure Type</span>
                </div>
                <div className="card card--padded" style={{ padding: '24px 24px 8px' }}>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={reasonData} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }}>
                      <XAxis
                        type="number"
                        unit="%"
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: C_DIM }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 11, fill: C_DIM }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="rate" fill={C_BLUE} radius={[0, 5, 5, 0]} maxBarSize={22}>
                        <LabelList
                          dataKey="rate"
                          position="right"
                          formatter={(v) => `${v}%`}
                          style={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font)' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recovery by Attempt */}
              <div className="section">
                <div className="section-hdr">
                  <span className="section-title">Recovery Rate by Retry Attempt</span>
                </div>
                <div className="card card--padded" style={{ padding: '24px 24px 8px' }}>
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={attemptData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: C_DIM }} axisLine={false} tickLine={false} />
                      <YAxis unit="%" domain={[0, 60]} tick={{ fontSize: 11, fill: C_DIM }} axisLine={false} tickLine={false} />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="rate" fill={C_GOLD} radius={[5, 5, 0, 0]} maxBarSize={44}>
                        <LabelList
                          dataKey="rate"
                          position="top"
                          formatter={(v) => `${v}%`}
                          style={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font)' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-muted text-xs" style={{ textAlign: 'center', marginTop: 8, marginBottom: 8 }}>
                    Recovery probability naturally diminishes with subsequent attempts — validating model monotonic decay
                  </p>
                </div>
              </div>
            </div>

            {/* Global Feature Importance */}
            {fiData.length > 0 && (
              <div className="section">
                <div className="section-hdr">
                  <span className="section-title">Global Feature Importance (XGBoost TreeExplainer)</span>
                </div>
                <div className="card card--padded" style={{ padding: '24px 24px 8px' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={fiData} layout="vertical" margin={{ left: 16, right: 56, top: 4, bottom: 4 }}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: C_DIM }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={180}
                        tick={{ fontSize: 12, fill: C_DIM }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<DarkTooltip />} />
                      <Bar dataKey="val" radius={[0, 6, 6, 0]} maxBarSize={26}>
                        {fiData.map((e, i) => (
                          <Cell key={e.name} fill={`hsl(${224 + i * 4}, ${70 - i * 3}%, ${60 - i * 3}%)`} />
                        ))}
                        <LabelList
                          dataKey="val"
                          position="right"
                          style={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font)' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
