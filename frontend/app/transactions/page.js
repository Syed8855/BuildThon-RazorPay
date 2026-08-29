'use client';
import { useEffect, useState, useCallback } from 'react';
import StatusBadge from '@/components/StatusBadge';
import ShapBars from '@/components/ShapBars';
import OrchestratorLine from '@/components/OrchestratorLine';

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const FILTERS = [
  { key: null,           label: 'All' },
  { key: 'pending_retry',label: 'Pending retry' },
  { key: 'retrying',     label: 'Retrying' },
  { key: 'recovered',    label: 'Recovered' },
  { key: 'hard_failed',  label: 'Hard-failed' },
  { key: 'churned',      label: 'Churned' },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);   // selected transaction_id
  const [detail, setDetail] = useState(null);        // full detail object
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page_size: 100 });
      if (filter) qs.set('status', filter);
      if (search) qs.set('search', search);
      const data = await fetch(`/api/transactions?${qs}`).then(r => r.json());
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
      setError(null);
    } catch {
      setError('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = useCallback(async (txnId) => {
    setSelected(txnId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await fetch(`/api/transactions/${txnId}`).then(r => r.json());
      setDetail(d);
    } catch {
      setDetail({ error: 'Could not load detail.' });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDrawer = () => { setSelected(null); setDetail(null); };

  return (
    <>
      <div className="section__header" style={{ marginBottom: 'var(--sp-4)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Transactions</h1>
        <span className="text-secondary text-sm">{total} total</span>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {FILTERS.map(f => (
          <button
            key={f.key ?? 'all'}
            id={`filter-${f.key ?? 'all'}`}
            className={`filter-pill${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
        <input
          id="txn-search"
          className="search-input"
          placeholder="Search ID or customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading && <div className="loading-state">⏳ Loading transactions…</div>}
      {error && <div className="error-state">{error}</div>}

      {!loading && !error && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
          <table className="feed-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Amount</th>
                <th>Failure reason</th>
                <th>Attempts</th>
                <th>Status</th>
                <th>Probability</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>No transactions found</td></tr>
              )}
              {transactions.map(txn => (
                <tr
                  key={txn.transaction_id}
                  id={`txn-row-${txn.transaction_id}`}
                  className={selected === txn.transaction_id ? 'active' : ''}
                  onClick={() => openDetail(txn.transaction_id)}
                >
                  <td><span className="text-mono">{txn.transaction_id}</span></td>
                  <td>{fmt.format(txn.amount)}</td>
                  <td><span className="badge badge--reason">{txn.failure_reason.replace(/_/g, ' ')}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{txn.attempt_count}/{txn.max_attempts}</td>
                  <td><StatusBadge status={txn.status} /></td>
                  <td>
                    {txn.success_probability != null ? (
                      <div className="prob-bar">
                        <div className="prob-bar__track">
                          <div className="prob-bar__fill" style={{ width: `${(txn.success_probability * 100).toFixed(0)}%` }} />
                        </div>
                        <span className="text-sm">{(txn.success_probability * 100).toFixed(0)}%</span>
                      </div>
                    ) : <span className="text-secondary text-sm">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer" id="detail-drawer">
            <div className="drawer__header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: '4px' }}>
                  <StatusBadge status={detail?.status} />
                  {detail?.is_hard_fail && <StatusBadge status="hard_failed" label="Hard-fail" />}
                </div>
                <span className="text-mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected}</span>
                {detail && (
                  <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>
                    {fmt.format(detail.amount)}
                  </div>
                )}
              </div>
              <button className="drawer__close" onClick={closeDrawer} id="drawer-close" aria-label="Close">✕</button>
            </div>

            <div className="drawer__body">
              {detailLoading && <div className="loading-state">⏳ Loading detail…</div>}
              {detail?.error && <div className="error-state">{detail.error}</div>}

              {detail && !detail.error && (
                <>
                  {/* Meta */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                    {[
                      ['Customer', detail.customer_id?.slice(0, 14) + '…'],
                      ['Segment', detail.customer_segment],
                      ['Payment method', detail.payment_method],
                      ['Merchant', detail.merchant_category?.replace(/_/g, ' ')],
                      ['Failure reason', detail.failure_reason?.replace(/_/g, ' ')],
                      ['Recurring', detail.is_recurring ? 'Yes' : 'No'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="text-secondary text-sm">{k}</div>
                        <div style={{ fontWeight: 500, fontSize: '14px', marginTop: '2px' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Orchestrator decision */}
                  <div>
                    <div className="drawer__section-title">Orchestrator decision</div>
                    <OrchestratorLine decision={detail.orchestrator_decision} />
                  </div>

                  {/* Model probability + SHAP */}
                  {detail.model_output && (
                    <div>
                      <div className="drawer__section-title">Model output</div>
                      <div className="prob-display" style={{ marginBottom: 'var(--sp-3)' }}>
                        <span
                          className="prob-display__value"
                          style={{ color: detail.model_output.success_probability > 0.5 ? 'var(--color-recovered)' : detail.model_output.success_probability > 0.25 ? 'var(--color-retrying)' : 'var(--text-secondary)' }}
                        >
                          {(detail.model_output.success_probability * 100).toFixed(0)}%
                        </span>
                        <span className="prob-display__label">success probability</span>
                      </div>
                      <ShapBars contributions={detail.model_output.shap_contributions} />
                    </div>
                  )}

                  {/* Attempt timeline */}
                  <div>
                    <div className="drawer__section-title">Attempt timeline</div>
                    <div className="timeline">
                      {(detail.attempt_timeline || []).map((a, i) => (
                        <div key={a.attempt_id || i} className="timeline-item">
                          <div className={`timeline-item__dot timeline-item__dot--${a.outcome === 'success' ? 'success' : a.outcome === 'fail' ? 'fail' : 'pending'}`}>
                            {a.attempt_number}
                          </div>
                          <div className="timeline-item__content">
                            <div className="timeline-item__label">
                              Attempt {a.attempt_number} — <StatusBadge status={a.outcome} />
                            </div>
                            <div className="timeline-item__meta">
                              {a.attempt_timestamp ? new Date(a.attempt_timestamp).toLocaleString('en-IN') : ''}
                              {a.time_since_last_attempt > 0 && ` · ${a.time_since_last_attempt.toFixed(1)}h since last`}
                            </div>
                            <div className="timeline-item__meta" style={{ marginTop: '2px' }}>
                              Channel: {a.channel?.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer message */}
                  {detail.customer_message && (
                    <div>
                      <div className="drawer__section-title">Customer message</div>
                      <div style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: 'var(--sp-4)',
                        fontSize: 'var(--fs-sm)',
                        fontStyle: 'italic',
                        lineHeight: 1.6,
                        color: 'var(--text-secondary)',
                      }}>
                        "{detail.customer_message}"
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
