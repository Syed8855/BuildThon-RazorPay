'use client';
// Analytics — analytics.md spec:
// 1. Funnel chart (horizontal stepped bars)
// 2. Recovery rate by attempt (bar chart) — proxy for "over time"
// 3. Global feature importance (horizontal bar chart)
// All from GET /api/analytics — same source as dashboard (analytics.md §Notes)

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from 'recharts';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

const COLORS = {
  hard_failed:  '#0A0A0A',
  retrying:     '#3395FF',
  recovered:    '#F2B705',
  churned:      '#8B90A0',
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Could not load analytics.'); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-state">⏳ Loading analytics…</div>;
  if (error)   return <div className="error-state">{error}</div>;

  const { funnel, revenue, recovery_by_reason, recovery_by_attempt, global_feature_importance } = data;

  // Funnel data — analytics.md §1: Failed → Retried → Recovered / Churned
  const funnelData = [
    { name: 'Total failed',    value: funnel.total_failed,  fill: '#E2E6EB' },
    { name: 'Hard-failed',     value: funnel.hard_failed,   fill: COLORS.hard_failed },
    { name: 'Retrying',        value: funnel.retrying,      fill: COLORS.retrying },
    { name: 'Recovered',       value: funnel.recovered,     fill: COLORS.recovered },
    { name: 'Churned',         value: funnel.churned,       fill: COLORS.churned },
  ];

  // Recovery by reason
  const reasonData = Object.entries(recovery_by_reason || {})
    .map(([reason, rate]) => ({ name: reason.replace(/_/g, ' '), rate: parseFloat((rate * 100).toFixed(1)) }))
    .sort((a, b) => b.rate - a.rate);

  // Recovery by attempt
  const attemptData = (recovery_by_attempt || []).map(r => ({
    name: `Attempt ${r.attempt_number}`,
    rate: parseFloat((r.recovery_rate * 100).toFixed(1)),
    n: r.n_attempts,
  }));

  // Feature importance
  const fiData = (global_feature_importance || []).slice(0, 8).map(f => ({
    name: f.feature.replace(/_/g, ' '),
    importance: parseFloat((f.importance * 100).toFixed(2)),
  }));

  return (
    <>
      <div className="section__header" style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Analytics</h1>
        <span className="text-secondary text-sm">All data from the same source as the dashboard</span>
      </div>

      {/* Revenue KPIs */}
      <div className="section">
        <div className="kpi-grid">
          {[
            { label: 'Recovery rate',     value: fmtPct(funnel.recovery_rate),      color: 'kpi-card__value--blue' },
            { label: 'Revenue recovered', value: fmt.format(revenue.recovered),      color: 'kpi-card__value--gold' },
            { label: 'Revenue at risk',   value: fmt.format(revenue.at_risk),        color: 'kpi-card__value--accent' },
            { label: 'Churned',           value: funnel.churned,                     color: '' },
          ].map(({ label, value, color }) => (
            <div key={label} className="kpi-card">
              <span className="kpi-card__label">{label}</span>
              <span className={`kpi-card__value ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 1. Funnel chart — analytics.md §1 */}
      <div className="section">
        <h2 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Recovery funnel</h2>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 16, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [v, 'Count']} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
                {funnelData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                <LabelList dataKey="value" position="right" style={{ fontSize: 13, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--sp-6)' }}>
        {/* 2. Recovery rate by failure reason */}
        <div className="section">
          <h2 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Recovery by failure reason</h2>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={reasonData} layout="vertical" margin={{ left: 16, right: 40 }}>
                <XAxis type="number" unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, 'Recovery rate']} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                <Bar dataKey="rate" fill="#3395FF" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  <LabelList dataKey="rate" position="right" formatter={v => `${v}%`} style={{ fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2b. Recovery rate by attempt — analytics.md §2 proxy for "over time" */}
        <div className="section">
          <h2 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Recovery rate by attempt number</h2>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attemptData} margin={{ left: 8, right: 24 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis unit="%" domain={[0, 55]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n, p) => [`${v}% (n=${p.payload.n})`, 'Recovery rate']} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                <Bar dataKey="rate" fill="#F2B705" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="rate" position="top" formatter={v => `${v}%`} style={{ fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center' }}>
              Recovery rate declines monotonically with attempt number — a key sanity check from DATA_SCHEMA.md
            </p>
          </div>
        </div>
      </div>

      {/* 3. Global feature importance — analytics.md §3 */}
      {fiData.length > 0 && (
        <div className="section">
          <h2 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Global feature importance (XGBoost)</h2>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={fiData} layout="vertical" margin={{ left: 24, right: 56 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v, 'Importance score']} contentStyle={{ fontSize: 13, borderRadius: 8 }} />
                <Bar dataKey="importance" fill="#3395FF" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  <LabelList dataKey="importance" position="right" style={{ fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
