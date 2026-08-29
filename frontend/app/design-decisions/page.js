// Design Decisions page — design-decisions-page.md spec.
// Renders docs/DESIGN_DECISIONS.md content in-app.
// Static — no API call needed.

import Link from 'next/link';

const DECISIONS = [
  {
    id: 1,
    title: 'Data: hybrid synthetic + Kaggle calibration',
    decision: 'Generate synthetic transactions with rule-derived probabilities, then calibrate the amount distribution against the Kaggle Online Payments Fraud Detection Dataset (INR-converted).',
    why: 'Purely synthetic data gives full label control and reproducibility — we know ground truth because we wrote the probability formula. Kaggle calibration prevents obviously fake amounts that would undermine realism.',
    rejected: 'Real production data was unavailable. A purely random amount distribution made the dataset look artificial during validation.',
    next: 'Replace synthetic generation with a Razorpay data connector once API access is available.',
  },
  {
    id: 2,
    title: 'Model target: retry success probability (not optimal timing)',
    decision: 'Predict P(success) for the next attempt given current state. Not "when to retry" — the backoff schedule handles timing via rules.',
    why: 'A classification target is well-defined, verifiable (did the retry succeed?), and directly interpretable via SHAP. Timing optimization requires reward modeling and is significantly harder to validate.',
    rejected: 'Reinforcement learning for retry timing. Too complex to validate, requires live feedback loop, and adds black-box risk in a compliance-sensitive context.',
    next: 'A/B test the probability gate against pure rules on live traffic to measure incremental recovery rate.',
  },
  {
    id: 3,
    title: 'Statefulness: feature engineering + guardrails (not sequence modeling)',
    decision: 'Encode temporal state as features (attempt_number, time_since_last_attempt, time_since_first_failure) fed to a gradient-boosted tree alongside rule-based guardrails.',
    why: 'Tabular GBM with hand-crafted temporal features outperforms sequence models on small-N retry sequences (max 4 attempts) and is far simpler to explain and deploy.',
    rejected: 'LSTM / Transformer over the attempt sequence. Overkill for max-4-step sequences, hard to interpret, requires much more data.',
    next: 'Add customer-level historical features (rolling failure rate, segment drift) to improve long-horizon predictions.',
  },
  {
    id: 4,
    title: 'Model choice: XGBoost (with LightGBM fallback)',
    decision: 'XGBoost with strong regularization (gamma=1.0, min_child_weight=15, max_depth=4). LightGBM available as --model flag.',
    why: 'XGBoost is well-understood, SHAP-compatible natively, ships TreeExplainer without approximation, and produced Val AUC=0.73 with train-val gap of 0.007 (well-calibrated, no overfit).',
    rejected: 'Neural network / deep GBM. Worse SHAP interpretability, no benefit on tabular data at this scale.',
    next: 'Isotonic calibration on top of raw XGBoost probabilities for better-calibrated confidence scores.',
  },
  {
    id: 5,
    title: 'Architecture: rules + ML hybrid (not pure ML)',
    decision: 'Hard rules fire first in fixed order: hard-fail short-circuit → max attempts → cycle cutoff → minimum spacing → model confidence gate → retry.',
    why: 'Rules handle the easy cases cheaply and provide safety guardrails. The model only runs when the rules leave genuine ambiguity. This also allows rules-only mode as a baseline comparison (shown in the Playground).',
    rejected: 'Pure ML deciding everything including hard-fail routing. Fails obviously on card_stolen transactions — unacceptable in production.',
    next: 'Per-merchant rule customization — some merchants want 2 max retries, others 6.',
  },
  {
    id: 6,
    title: 'Deployment: Next.js API proxy (not direct browser-to-backend calls)',
    decision: 'All FastAPI calls go through Next.js /api/* routes server-side. FASTAPI_BASE_URL is never exposed to the browser bundle.',
    why: 'Keeps the backend URL private, enables request-level auth headers in future, and means CORS is never configured on the FastAPI service.',
    rejected: 'Direct browser fetch to Render URL. Exposes backend URL in source, requires CORS wildcard, makes it hard to swap backends.',
    next: 'Add JWT authentication on the proxy layer.',
  },
  {
    id: 7,
    title: 'Validation: perturbed-parameter testing (not naive holdout)',
    decision: 'Generate a second dataset with shifted parameters (lower success rates, different distribution shapes) and evaluate the model on it as an out-of-distribution test.',
    why: 'A simple holdout from the same generator would inflate AUC by letting the model re-derive the generator formula. Perturbed parameters test whether the model learned real features, not generator artifacts. Val AUC=0.73, perturbed AUC=0.72 — only 0.014 drop.',
    rejected: 'Standard 80/20 split on one dataset. Would hide overfit-to-generator artifacts.',
    next: 'True held-out live data is the gold standard; perturbed synthetic is the best available proxy.',
  },
];

export default function DesignDecisionsPage() {
  return (
    <>
      <div className="section__header" style={{ marginBottom: 'var(--sp-6)' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600 }}>Design Decisions</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 4, maxWidth: 560 }}>
            Every non-obvious choice made during the build — what was chosen, why, and what alternatives were rejected.
            Meant to be skimmed in 60–90 seconds.
          </p>
        </div>
        <Link href="/playground" style={{ fontSize: '14px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
          Try the playground →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        {DECISIONS.map((d) => (
          <div key={d.id} style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-card)',
            padding: 'var(--sp-6)',
            boxShadow: 'var(--shadow-card)',
            borderLeft: '4px solid var(--accent)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 'var(--sp-4)' }}>
              <span style={{
                background: 'var(--accent)', color: '#fff',
                borderRadius: '50%', width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{d.id}</span>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{d.title}</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sp-4)' }}>
              {[
                { label: '✅ Decision', text: d.decision, accent: 'rgba(51,149,255,0.06)', border: 'rgba(51,149,255,0.15)' },
                { label: '💡 Why',     text: d.why,      accent: 'rgba(242,183,5,0.05)',  border: 'rgba(242,183,5,0.20)' },
                { label: '❌ Rejected',text: d.rejected,  accent: 'rgba(10,10,10,0.04)',   border: 'rgba(10,10,10,0.10)' },
              ].map(({ label, text, accent, border }) => (
                <div key={label} style={{
                  background: accent,
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>

            {d.next && (
              <div style={{ marginTop: 'var(--sp-3)', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                🗓 With more time: {d.next}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
