'use client';
import { useEffect, useState, useCallback } from 'react';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';
import Link from 'next/link';

// Format helpers — UI_SPEC.md: always use Intl.NumberFormat, never raw floats
const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n);

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [a, t] = await Promise.all([
        fetch('/api/analytics').then(r => r.json()),
        fetch('/api/transactions?page=1&page_size=6').then(r => r.json()),
      ]);
      setAnalytics(a);
      setTransactions(t.transactions || []);
      setError(null);
    } catch (e) {
      setError('Could not load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-state">⏳ Loading dashboard...</div>;
  if (error)   return <div className="error-state">{error}</div>;

  const { funnel, revenue } = analytics || {};

  return (
    <>
      <div className="section">
        <div className="section__header">
          <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Dashboard</h1>
          <span className="text-secondary text-sm">
            {fmtNum(funnel?.total_failed || 0)} transactions total
          </span>
        </div>

        {/* KPI strip — UI_SPEC.md dashboard.md */}
        <div className="kpi-grid">
          <KpiCard
            label="Recovery rate"
            value={`${((funnel?.recovery_rate || 0) * 100).toFixed(1)}%`}
            colorClass="kpi-card__value--blue"
            sub={`${fmtNum(funnel?.recovered || 0)} of ${fmtNum((funnel?.total_failed || 0) - (funnel?.hard_failed || 0))} transient`}
          />
          <KpiCard
            label="Revenue recovered"
            value={fmt.format(revenue?.recovered || 0)}
            colorClass="kpi-card__value--gold"
          />
          <KpiCard
            label="Active retries"
            value={fmtNum(funnel?.retrying || 0)}
            colorClass="kpi-card__value--accent"
            sub="in progress"
          />
          <KpiCard
            label="Hard-failed / unrecoverable"
            value={fmtNum(funnel?.hard_failed || 0)}
            colorClass="kpi-card__value--black"
            sub="card expired, stolen, closed"
          />
        </div>
      </div>

      {/* Revenue at risk — DIFFERENTIATORS.md #1 */}
      <div className="section">
        <div style={{
          background: 'linear-gradient(135deg, rgba(51,149,255,0.08), rgba(242,183,5,0.06))',
          border: '1px solid rgba(51,149,255,0.20)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--sp-6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--sp-4)',
        }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>
              Revenue currently at risk
            </div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#B28A00' }}>
              {fmt.format(revenue?.at_risk || 0)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Retrying transactions — not yet recovered or churned
            </div>
          </div>
          <div style={{ fontSize: '48px', opacity: 0.3 }}>💸</div>
        </div>
      </div>

      {/* Recent activity — transaction feed preview */}
      <div className="section">
        <div className="section__header">
          <h2 className="section__title">Recent activity</h2>
          <Link href="/transactions" className="section__action">View all →</Link>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <table className="feed-table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Failure reason</th>
                <th>Attempts</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>No transactions</td></tr>
              )}
              {transactions.map(txn => (
                <tr key={txn.transaction_id} onClick={() => window.location.href = `/transactions`}>
                  <td>
                    <span className="text-mono">{txn.transaction_id.slice(0, 14)}…</span>
                    <div className="text-secondary text-sm">{fmt.format(txn.amount)}</div>
                  </td>
                  <td><span className="badge badge--reason">{txn.failure_reason.replace(/_/g, ' ')}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{txn.attempt_count}/{txn.max_attempts}</td>
                  <td><StatusBadge status={txn.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
