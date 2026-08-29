'use client';
import { useState } from 'react';
import OrchestratorLine from '@/components/OrchestratorLine';
import ShapBars from '@/components/ShapBars';

const FAILURE_REASONS = [
  'insufficient_funds','issuer_declined','do_not_honor',
  'processing_error','network_timeout','card_expired',
  'card_stolen','account_closed',
];
const PAYMENT_METHODS = ['card','upi','netbanking'];
const MERCHANTS = ['saas','d2c_subscription','ecommerce_one_time'];
const SEGMENTS = ['new','returning','high_value'];

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const DEFAULT = {
  failure_reason: 'insufficient_funds',
  attempt_number: 1,
  time_since_last_attempt_hours: 24,
  time_since_first_failure_hours: 24,
  is_near_payday: false,
  payment_method: 'card',
  is_recurring: true,
  merchant_category: 'saas',
  customer_segment: 'returning',
  historical_failure_rate: 0.15,
  amount: 999,
};

export default function PlaygroundPage() {
  const [form, setForm] = useState(DEFAULT);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const run = async () => {
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

  return (
    <>
      <div className="section__header" style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Simulation playground</h1>
        <span className="text-secondary text-sm">
          Test any hypothetical transaction through the orchestrator
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-6)' }}>
        {/* Input form */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Transaction parameters</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <Field label="Failure reason">
              <select id="sim-failure-reason" value={form.failure_reason} onChange={e => set('failure_reason', e.target.value)}>
                {FAILURE_REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <Field label="Amount (INR)">
              <input id="sim-amount" type="number" value={form.amount} onChange={e => set('amount', Number(e.target.value))} min={1} />
            </Field>
            <Field label="Attempt number">
              <select id="sim-attempt-number" value={form.attempt_number} onChange={e => set('attempt_number', Number(e.target.value))}>
                {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Hours since last attempt">
              <input id="sim-hours-last" type="number" value={form.time_since_last_attempt_hours} onChange={e => set('time_since_last_attempt_hours', Number(e.target.value))} min={0} />
            </Field>
            <Field label="Payment method">
              <select id="sim-payment-method" value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Merchant category">
              <select id="sim-merchant" value={form.merchant_category} onChange={e => set('merchant_category', e.target.value)}>
                {MERCHANTS.map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <Field label="Customer segment">
              <select id="sim-segment" value={form.customer_segment} onChange={e => set('customer_segment', e.target.value)}>
                {SEGMENTS.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
                <input id="sim-recurring" type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} />
                Recurring subscription
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
                <input id="sim-payday" type="checkbox" checked={form.is_near_payday} onChange={e => set('is_near_payday', e.target.checked)} />
                Near payday
              </label>
            </div>
          </div>

          <button
            id="sim-run-btn"
            onClick={run}
            disabled={loading}
            style={{
              marginTop: 'var(--sp-4)',
              width: '100%',
              padding: '10px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 'var(--fs-sm)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 200ms',
            }}
          >
            {loading ? 'Running simulation…' : 'Run simulation →'}
          </button>

          {error && <div className="error-state" style={{ marginTop: 'var(--sp-3)' }}>{error}</div>}
        </div>

        {/* Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {!result && !loading && (
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius-card)',
              padding: 'var(--sp-8)', textAlign: 'center',
              color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)',
              boxShadow: 'var(--shadow-card)',
            }}>
              Configure a transaction and click "Run simulation" to see what the orchestrator decides.
            </div>
          )}
          {loading && <div className="loading-state">⏳ Simulating…</div>}

          {result && (
            <>
              {/* Rules-vs-ML comparison — DIFFERENTIATORS.md #2 */}
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
                <h3 style={{ marginBottom: 'var(--sp-4)' }}>Rules vs ML comparison</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                  <div>
                    <div className="text-secondary text-sm" style={{ marginBottom: 'var(--sp-2)', fontWeight: 600 }}>Rules only</div>
                    <OrchestratorLine decision={result.rules_only_decision} />
                  </div>
                  <div>
                    <div className="text-secondary text-sm" style={{ marginBottom: 'var(--sp-2)', fontWeight: 600 }}>Rules + ML</div>
                    <OrchestratorLine decision={result.orchestrator_decision} />
                  </div>
                </div>
                {result.orchestrator_decision?.action !== result.rules_only_decision?.action && (
                  <div style={{
                    marginTop: 'var(--sp-3)',
                    padding: 'var(--sp-3)',
                    background: 'rgba(242,183,5,0.08)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--fs-sm)',
                    color: '#B28A00',
                  }}>
                    ✨ ML changed the decision — the model adds measurable value over rules alone.
                  </div>
                )}
              </div>

              {/* Model output */}
              {result.model_output && (
                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
                  <h3 style={{ marginBottom: 'var(--sp-4)' }}>Model output</h3>
                  <div style={{ fontSize: '40px', fontWeight: 700, color: 'var(--accent)', marginBottom: 'var(--sp-3)' }}>
                    {(result.model_output.success_probability * 100).toFixed(0)}%
                    <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>success probability</span>
                  </div>
                  <ShapBars contributions={result.model_output.shap_contributions} />
                </div>
              )}

              {/* Customer message */}
              {result.customer_message && (
                <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-card)' }}>
                  <h3 style={{ marginBottom: 'var(--sp-3)' }}>Customer message</h3>
                  <p style={{ fontSize: 'var(--fs-sm)', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    "{result.customer_message}"
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, display: 'block', marginBottom: '4px' }}>{label}</label>
      {children}
      <style jsx>{`
        select, input[type="number"], input[type="text"] {
          width: 100%;
          padding: 7px 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--bg);
          color: var(--text-primary);
          font-size: var(--fs-sm);
          outline: none;
        }
        select:focus, input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}
