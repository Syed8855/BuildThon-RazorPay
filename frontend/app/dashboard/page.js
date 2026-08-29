'use client';
// Dashboard — dashboard.md spec:
// 1. KPI strip (4 metric cards)
// 2. Money-at-risk live counter (differentiator #1)
// 3. Pictogram chart — stickman figures, staggered entrance (Framer Motion)
//    Fallback if skipped: funnel bar chart
// 4. Recent activity feed preview (5-6 rows)

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0);

// ── Stickman SVG — dashboard.md §3 Pictogram chart
function Stickman({ color, size = 22 }) {
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 22 36" fill={color} style={{ display: 'block' }}>
      <circle cx="11" cy="5" r="4.5" />
      <line x1="11" y1="9.5" x2="11" y2="24" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="14" x2="3"  y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="14" x2="19" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="24" x2="5"  y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="24" x2="17" y2="34" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// dashboard.md: N = ceil(max/25), rounded to clean number
function cleanN(max) {
  const raw = Math.ceil(max / 25);
  if (raw <= 1)   return 1;
  if (raw <= 5)   return 5;
  if (raw <= 10)  return 10;
  if (raw <= 25)  return 25;
  if (raw <= 50)  return 50;
  if (raw <= 100) return 100;
  return 500;
}

function PictogramColumn({ label, count, color, totalDelay = 0 }) {
  const N = Math.max(1, cleanN(count));
  const figures = Math.min(Math.round(count / N), 30);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap-reverse',
        justifyContent: 'center', gap: 4,
        width: 180, minHeight: 120,
        alignContent: 'flex-end',
      }}>
        {Array.from({ length: figures }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: totalDelay + Math.min(i * 0.06, 1.8), // cap per-figure delay
              type: 'spring', stiffness: 280, damping: 18,
            }}
          >
            <Stickman color={color} size={20} />
          </motion.div>
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{fmtNum(count)}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

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
    } catch {
      setError('Could not load data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading-state">⏳ Loading dashboard…</div>;
  if (error)   return <div className="error-state">{error}</div>;

  const { funnel, revenue } = analytics || {};
  const maxCol = Math.max(funnel?.total_failed || 0, funnel?.retrying || 0, funnel?.recovered || 0);
  const N = cleanN(maxCol);

  return (
    <>
      <div className="section__header">
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Dashboard</h1>
        <span className="text-secondary text-sm">{fmtNum(funnel?.total_failed)} transactions total</span>
      </div>

      {/* 1. KPI strip */}
      <div className="section">
        <div className="kpi-grid">
          <KpiCard label="Recovery rate" value={`${((funnel?.recovery_rate || 0) * 100).toFixed(1)}%`}
            colorClass="kpi-card__value--blue"
            sub={`${fmtNum(funnel?.recovered)} of ${fmtNum((funnel?.total_failed || 0) - (funnel?.hard_failed || 0))} transient`} />
          <KpiCard label="Revenue recovered" value={fmt.format(revenue?.recovered || 0)}
            colorClass="kpi-card__value--gold" />
          <KpiCard label="Active retries" value={fmtNum(funnel?.retrying)}
            colorClass="kpi-card__value--accent" sub="in progress" />
          <KpiCard label="Hard-failed" value={fmtNum(funnel?.hard_failed)}
            colorClass="kpi-card__value--black" sub="card expired / stolen / closed" />
        </div>
      </div>

      {/* 2. Money-at-risk counter — differentiator #1 */}
      <div className="section">
        <div style={{
          background: 'linear-gradient(135deg, rgba(51,149,255,0.08), rgba(242,183,5,0.06))',
          border: '1px solid rgba(51,149,255,0.20)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--sp-6)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)',
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 4 }}>
              Revenue currently at risk
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#B28A00' }}>
              {fmt.format(revenue?.at_risk || 0)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Transactions in retry cycle — not yet recovered or churned
            </div>
          </div>
          <div style={{ fontSize: 48, opacity: 0.25 }}>💸</div>
        </div>
      </div>

      {/* 3. Pictogram chart — dashboard.md §3 */}
      <div className="section">
        <div className="section__header">
          <h2 className="section__title">Recovery pictogram</h2>
          <span className="text-secondary text-sm">each figure = {N} transaction{N !== 1 ? 's' : ''}</span>
        </div>
        <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--sp-8) var(--sp-4)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', flexWrap: 'wrap', gap: 32,
        }}>
          <PictogramColumn label="Hard-failed" count={funnel?.hard_failed || 0} color="#0A0A0A" totalDelay={0} />
          <PictogramColumn label="Retrying / pending" count={funnel?.retrying || 0} color="#3395FF" totalDelay={0.3} />
          <PictogramColumn label="Recovered" count={funnel?.recovered || 0} color="#B28A00" totalDelay={0.6} />
        </div>
      </div>

      {/* 4. Recent activity */}
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
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 32 }}>No transactions</td></tr>
              )}
              {transactions.map(txn => (
                <tr key={txn.transaction_id} onClick={() => window.location.href = '/transactions'} style={{ cursor: 'pointer' }}>
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
