'use client';
// Playground — playground.md spec:
// - Input panel: failure reason, attempt number, time since last, segment, run button
// - Validate inputs, show inline error on missing fields
// - Output: orchestrator decision (shown first), rules-vs-ML comparison, 
//   model output with FlipCard reuse (playground.md §3), SHAP bars, customer message

import { useState } from 'react';
import OrchestratorLine from '@/components/OrchestratorLine';
import ShapBars from '@/components/ShapBars';
import FlipCard from '@/components/FlipCard';

const FAILURE_REASONS = [
  'insufficient_funds','issuer_declined','do_not_honor',
  'processing_error','network_timeout','card_expired',
  'card_stolen','account_closed',
];
const PAYMENT_METHODS = ['card','upi','netbanking'];
const MERCHANTS = ['saas','d2c_subscription','ecommerce_one_time'];
const SEGMENTS = ['new','returning','high_value'];

const REQUIRED = ['failure_reason','payment_method','merchant_category','customer_segment'];

const DEFAULT = {
  failure_reason: '',
  attempt_number: 1,
  time_since_last_attempt_hours: 24,
  time_since_first_failure_hours: 24,
  is_near_payday: false,
  payment_method: '',
  is_recurring: true,
  merchant_category: '',
  customer_segment: '',
  historical_failure_rate: 0.15,
  amount: 999,
};

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function PlaygroundPage() {
  const [form, setForm] = useState(DEFAULT);
  const [fieldErrors, setFieldErrors] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (fieldErrors[k]) setFieldErrors(e => ({ ...e, [k]: null }));
  };

  const validate = () => {
    const errors = {};
    REQUIRED.forEach(k => {
      if (!form[k]) errors[k] = 'This field is required';
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const run = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).then(r => r.json());
      setResult(data);
    } catch {
      setError('Simulation failed. Is the backend reachable?');
    } finally {
      setLoading(false);
    }
  };

  const prob = result?.model_output?.success_probability ?? null;

  return (
    <>
      <div className="section__header" style={{ marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Simulation playground</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Test any hypothetical transaction through the full orchestrator pipeline
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 'var(--sp-6)', alignItems: 'start' }}>

        {/* ── Input panel */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--sp-4)' }}>Transaction parameters</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <Field label="Failure reason *" error={fieldErrors.failure_reason}>
              <select id="sim-failure-reason" value={form.failure_reason} onChange={e => set('failure_reason', e.target.value)}>
                <option value="">— select —</option>
                {FAILURE_REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
              </select>
            </Field>

            <Field label="Amount (INR)">
              <input id="sim-amount" type="number" value={form.amount} onChange={e => set('amount', Number(e.target.value))} min={1} />
            </Field>

            <Field label="Attempt number">
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4].map(n => (
                  <button key={n} id={`sim-attempt-${n}`}
                    onClick={() => set('attempt_number', n)}
                    style={{
                      flex: 1, padding: '8px 0',
                      background: form.attempt_number === n ? 'var(--accent)' : 'var(--bg)',
                      color: form.attempt_number === n ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${form.attempt_number === n ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                      transition: 'all 200ms',
                    }}
                  >{n}</button>
                ))}
              </div>
            </Field>

            <Field label="Hours since last attempt">
              <input id="sim-hours-last" type="number" value={form.time_since_last_attempt_hours} onChange={e => set('time_since_last_attempt_hours', Number(e.target.value))} min={0} />
            </Field>

            <Field label="Payment method *" error={fieldErrors.payment_method}>
              <select id="sim-payment-method" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                <option value="">— select —</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>

            <Field label="Merchant category *" error={fieldErrors.merchant_category}>
              <select id="sim-merchant" value={form.merchant_category} onChange={e => set('merchant_category', e.target.value)}>
                <option value="">— select —</option>
                {MERCHANTS.map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
              </select>
            </Field>

            <Field label="Customer segment *" error={fieldErrors.customer_segment}>
              <select id="sim-segment" value={form.customer_segment} onChange={e => set('customer_segment', e.target.value)}>
                <option value="">— select —</option>
                {SEGMENTS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </Field>

            <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input id="sim-recurring" type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} />
                Recurring subscription
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input id="sim-payday" type="checkbox" checked={form.is_near_payday} onChange={e => set('is_near_payday', e.target.checked)} />
                Near payday
              </label>
            </div>
          </div>

          <button id="sim-run-btn" onClick={run} disabled={loading} style={{
            marginTop: 'var(--sp-4)', width: '100%', padding: '11px',
            background: loading ? 'var(--border)' : 'var(--accent)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 200ms',
          }}>
            {loading ? 'Simulating…' : 'Run simulation →'}
          </button>

          {error && <div className="error-state" style={{ marginTop: 'var(--sp-3)' }}>{error}</div>}
        </div>

        {/* ── Output panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {!result && !loading && (
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius-card)',
              padding: 'var(--sp-8)', textAlign: 'center',
              color: 'var(--text-secondary)', fontSize: 14,
              boxShadow: 'var(--shadow-card)', minHeight: 200,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              Configure a transaction and click "Run simulation" to see what the orchestrator decides.
            </div>
          )}
          {loading && <div className="loading-state">⏳ Simulating…</div>}

          {result && (
            <>
              {/* 1. Orchestrator decision (shown first per playground.md) */}
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Orchestrator decision
                </div>
                <OrchestratorLine decision={result.orchestrator_decision} />
              </div>

              {/* 2. Rules-vs-ML comparison — playground.md §2, non-droppable */}
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Rules only vs ML-enhanced
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Rules only</div>
                    <OrchestratorLine decision={result.rules_only_decision} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Rules + ML</div>
                    <OrchestratorLine decision={result.orchestrator_decision} />
                  </div>
                </div>
                {result.orchestrator_decision?.action !== result.rules_only_decision?.action && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px',
                    background: 'rgba(242,183,5,0.08)', borderRadius: 6,
                    fontSize: 13, color: '#B28A00',
                  }}>
                    ✨ The ML layer changed the decision — model adds measurable value over rules alone.
                  </div>
                )}
              </div>

              {/* 3. Model output with FlipCard — playground.md §3 */}
              {result.model_output && (
                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    Model output
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    {/* Scaled-down hero card — playground.md: "reuses the same Framer Motion component" */}
                    <FlipCard scale="small" probability={prob} autoPlay={false} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 42, fontWeight: 700, color: prob > 0.5 ? '#F2B705' : prob > 0.25 ? '#3395FF' : 'var(--text-secondary)', lineHeight: 1 }}>
                        {(prob * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, marginBottom: 16 }}>
                        success probability
                      </div>
                      <ShapBars contributions={result.model_output.shap_contributions} />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Customer message — playground.md §4 */}
              {result.customer_message && (
                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                    Customer message preview
                  </div>
                  <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    "{result.customer_message}"
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        select, input[type="number"], input[type="text"] {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg);
          color: var(--text-primary);
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 200ms;
        }
        select:focus, input:focus { border-color: var(--accent); }
        select.error, input.error { border-color: #E53935; }
      `}</style>
    </>
  );
}

function Field({ label, children, error }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
      {error && <div style={{ fontSize: 12, color: '#E53935', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
