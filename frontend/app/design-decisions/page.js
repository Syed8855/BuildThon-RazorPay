'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'

// Design Decisions — static page, no API needed.
// Rendered with unified dark design system.

const ease = [0.22,1,0.36,1]

const DECISIONS = [
  {
    id:1,
    title:'Data: hybrid synthetic + Kaggle calibration',
    decision:'Generate synthetic transactions with rule-derived ground-truth labels, then calibrate amount distributions against the Kaggle Online Payments Fraud dataset (INR-converted).',
    why:'Purely synthetic data gives full label control and reproducibility. Kaggle calibration prevents obviously fake amounts. We know ground truth because we wrote the probability formula — validation is reliable.',
    rejected:'Real production data (unavailable). Pure random amounts (looked artificial during validation).',
    next:'Replace synthetic generation with a Razorpay data connector once API access is available.',
  },
  {
    id:2,
    title:'Model target: retry success probability (not timing)',
    decision:'Predict P(success) for the next attempt given current state. Timing is handled by the rules backoff schedule — the model gates the decision, not the schedule.',
    why:'Classification target is well-defined, verifiable (did the retry succeed?), and directly interpretable via SHAP. Val AUC = 0.73, train-val gap = 0.007 — well-calibrated, no overfit.',
    rejected:'RL for retry timing — too complex to validate, requires live feedback loop, black-box risk in compliance context.',
    next:'A/B test the probability gate vs. pure rules on live traffic to measure incremental recovery.',
  },
  {
    id:3,
    title:'Model: XGBoost with strong regularization',
    decision:'XGBoost (gamma=1.0, min_child_weight=15, max_depth=4). LightGBM available as --model flag. SHAP via TreeExplainer (exact, no approximation).',
    why:'Native SHAP support, tabular data advantage over deep models, interpretable feature splits. Perturbed-param OOD test showed only 0.014 AUC drop — model learned real features, not generator artifacts.',
    rejected:'Neural network / deep GBM — worse SHAP interpretability, no benefit on tabular data at this scale.',
    next:'Isotonic calibration on top of raw probabilities for better-calibrated confidence intervals.',
  },
  {
    id:4,
    title:'Architecture: rules + ML hybrid (not pure ML)',
    decision:'Hard rules fire in fixed order: hard-fail short-circuit → max attempts → cycle cutoff → minimum spacing → ML confidence gate → retry. Rules-only mode available as baseline comparison (Playground).',
    why:'Rules handle obvious cases cheaply. ML runs only on genuine ambiguity. Card stolen transactions are never retried — unacceptable to pass to the model. Rules also provide safety for compliance.',
    rejected:'Pure ML routing — fails obviously on card_stolen, account_closed. Adds risk in compliance-sensitive context.',
    next:'Per-merchant rule customization — some merchants want 2 max retries, others 6.',
  },
  {
    id:5,
    title:'Validation: perturbed-parameter testing (not naive holdout)',
    decision:'Generate a second dataset with shifted parameters (lower success rates, different distribution shapes) and evaluate as an OOD test. Val AUC = 0.73 → perturbed AUC = 0.72 (0.014 drop only).',
    why:'A simple holdout from the same generator inflates AUC — the model could re-derive the generator formula. Perturbed parameters test whether real features were learned.',
    rejected:'Standard 80/20 split on one dataset — hides overfit-to-generator artifacts.',
    next:'True held-out live data is the gold standard; perturbed synthetic is the best available proxy.',
  },
  {
    id:6,
    title:'Statefulness: feature engineering (not sequence modeling)',
    decision:'Encode temporal state as features: attempt_number, time_since_last_attempt, time_since_first_failure. Fed to GBM alongside rule-based guardrails.',
    why:'Tabular GBM with hand-crafted temporal features outperforms sequence models on max-4-step sequences. Far simpler to explain and deploy. SHAP is exact on tree models.',
    rejected:'LSTM / Transformer over attempt sequence — overkill for 4-step max, hard to interpret, needs much more data.',
    next:'Add customer-level historical features (rolling failure rate, segment drift) for long-horizon improvement.',
  },
  {
    id:7,
    title:'Frontend: Next.js API proxy (not direct browser-to-backend)',
    decision:'All FastAPI calls go through Next.js /api/* server-side routes. FASTAPI_BASE_URL is never exposed to the browser bundle.',
    why:'Keeps backend URL private, enables future auth headers, means CORS is never configured on the FastAPI service. Trivial to swap backend URLs.',
    rejected:'Direct browser fetch to Render URL — exposes backend URL in source, requires CORS wildcard.',
    next:'Add JWT authentication on the proxy layer.',
  },
]

export default function DesignDecisionsPage() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-hdr">
          <div className="eyebrow"><span className="eyebrow__dot"/>Architecture</div>
          <h1>Design decisions</h1>
          <p className="page-hdr__sub">
            Every non-obvious choice — what was decided, why, and what was rejected.
            Designed to be skimmed in 90 seconds.
          </p>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {DECISIONS.map((d,i)=>(
            <motion.div key={d.id}
              initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
              transition={{delay:i*0.06,duration:0.4,ease}}
              className="card card--padded"
              style={{borderLeft:'3px solid var(--accent)',borderRadius:'0 var(--radius-lg) var(--radius-lg) 0'}}>

              {/* Header */}
              <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:16}}>
                <div style={{
                  width:24,height:24,borderRadius:'50%',flexShrink:0,
                  background:'var(--accent-subtle)',border:'1px solid rgba(82,132,255,0.25)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:11,fontWeight:700,color:'var(--accent)',
                }}>{d.id}</div>
                <h3 style={{fontSize:16,fontWeight:600,letterSpacing:'-0.02em',lineHeight:1.3}}>
                  {d.title}
                </h3>
              </div>

              {/* Cards grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
                {[
                  {label:'✦ Decision',text:d.decision,bg:'rgba(82,132,255,0.05)',  bd:'rgba(82,132,255,0.15)'},
                  {label:'◈ Why',     text:d.why,     bg:'rgba(242,183,5,0.04)',   bd:'rgba(242,183,5,0.14)'},
                  {label:'✕ Rejected',text:d.rejected,bg:'rgba(255,255,255,0.025)',bd:'rgba(255,255,255,0.07)'},
                ].map(({label,text,bg,bd})=>(
                  <div key={label} style={{
                    background:bg, border:`1px solid ${bd}`,
                    borderRadius:'var(--radius-sm)', padding:'12px 14px',
                  }}>
                    <div style={{fontSize:10,fontWeight:600,color:'var(--text-muted)',
                      textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:7}}>
                      {label}
                    </div>
                    <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.65}}>{text}</p>
                  </div>
                ))}
              </div>

              {d.next && (
                <div style={{marginTop:12,fontSize:12,color:'var(--text-muted)',fontStyle:'italic',
                  paddingTop:12,borderTop:'1px solid var(--border)'}}>
                  🗓 With more time: {d.next}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div style={{marginTop:40,textAlign:'center'}}>
          <Link href="/playground" className="btn btn-primary">
            Try the playground →
          </Link>
        </div>
      </div>
    </div>
  )
}
