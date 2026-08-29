'use client';
import { useEffect, useState } from 'react';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fmtPct = (n) => `${(n * 100).toFixed(1)}%`;

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

  return (
    <>
      <div className="section__header" style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Analytics</h1>
        <span className="text-secondary text-sm">Model + recovery performance</span>
      </div>

      {/* Funnel */}
      <div className="section">
        <h3 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Recovery funnel</h3>
        <div className="kpi-grid">
          {[
            { label: 'Total failed', value: funnel.total_failed, color: '' },
            { label: 'Hard-failed', value: funnel.hard_failed, color: 'kpi-card__value--black' },
            { label: 'Recovered', value: funnel.recovered, color: 'kpi-card__value--gold' },
            { label: 'Retrying / pending', value: funnel.retrying, color: 'kpi-card__value--blue' },
            { label: 'Churned', value: funnel.churned, color: '' },
            { label: 'Recovery rate', value: fmtPct(funnel.recovery_rate), color: 'kpi-card__value--accent' },
          ].map(({ label, value, color }) => (
            <div key={label} className="kpi-card">
              <span className="kpi-card__label">{label}</span>
              <span className={`kpi-card__value ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue */}
      <div className="section">
        <h3 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Revenue</h3>
        <div className="kpi-grid">
          <div className="kpi-card">
            <span className="kpi-card__label">Revenue recovered</span>
            <span className="kpi-card__value kpi-card__value--gold">{fmt.format(revenue.recovered)}</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-card__label">Revenue at risk</span>
            <span className="kpi-card__value kpi-card__value--blue">{fmt.format(revenue.at_risk)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)' }}>
        {/* Recovery by failure reason */}
        <div className="section">
          <h3 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Recovery rate by failure reason</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {Object.entries(recovery_by_reason)
              .sort(([, a], [, b]) => b - a)
              .map(([reason, rate]) => (
                <div key={reason}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{reason.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{fmtPct(rate)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: fmtPct(rate), background: 'var(--accent)', borderRadius: '3px', transition: 'width 600ms ease' }} />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recovery by attempt number */}
        <div className="section">
          <h3 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Recovery rate by attempt</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {(recovery_by_attempt || []).map(row => (
              <div key={row.attempt_number}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Attempt {row.attempt_number}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{fmtPct(row.recovery_rate)} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>({row.n_attempts} attempts)</span></span>
                </div>
                <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: fmtPct(row.recovery_rate), background: 'var(--color-retrying)', borderRadius: '3px', transition: 'width 600ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global feature importance */}
      {global_feature_importance?.length > 0 && (
        <div className="section">
          <h3 className="section__title" style={{ marginBottom: 'var(--sp-4)' }}>Global feature importance (model)</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {global_feature_importance.map(f => {
              const maxImp = global_feature_importance[0]?.importance || 1;
              const pct = ((f.importance / maxImp) * 100).toFixed(1);
              return (
                <div key={f.feature}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{f.feature.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{(f.importance * 100).toFixed(2)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
