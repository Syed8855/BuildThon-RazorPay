'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StatusBadge from '@/components/StatusBadge'
import OrchestratorLine from '@/components/OrchestratorLine'
import ShapBars from '@/components/ShapBars'

const fmtINR = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n??0)
const ease   = [0.22,1,0.36,1]

const STATUS_FILTERS = ['all','retrying','recovered','failed','churned']
const REASON_FILTERS = ['all','insufficient_funds','issuer_declined','do_not_honor','processing_error','card_expired','card_stolen']

function WakingUp() {
  const [d,setD] = useState('.')
  useEffect(()=>{ const t=setInterval(()=>setD(x=>x.length>=3?'.':x+'.'),500); return()=>clearInterval(t) },[])
  return (
    <div className="state-loading">
      <div style={{fontSize:28}}>⚡</div>
      <div className="state-loading__title">Connecting to backend{d}</div>
      <div className="state-loading__sub">Render free-tier cold-start (~30s). Retrying automatically.</div>
      <div className="state-loading__bar"/>
    </div>
  )
}

function DetailDrawer({ txn, onClose }) {
  if (!txn) return null
  const prob = txn.ml_result?.success_probability ?? null
  const probCls = prob===null ? '' : prob>0.5 ? 'prob-val--high' : prob>0.25 ? 'prob-val--mid' : 'prob-val--low'

  return (
    <AnimatePresence>
      <div className="drawer-overlay" onClick={onClose}/>
      <motion.aside className="drawer"
        initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}}
        transition={{duration:0.28,ease}}>
        <div className="drawer__header">
          <div>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',
              letterSpacing:'0.07em',marginBottom:6}}>Transaction detail</div>
            <div className="text-mono" style={{fontSize:14,color:'var(--text-primary)'}}>{txn.transaction_id}</div>
            <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
              <StatusBadge status={txn.status}/>
              <span className="text-muted text-xs">{fmtINR(txn.amount)}</span>
            </div>
          </div>
          <button className="btn btn-icon" onClick={onClose} style={{flexShrink:0}}>✕</button>
        </div>

        <div className="drawer__body">
          {/* Orchestrator */}
          <div>
            <div className="drawer__section-hdr">Orchestrator decision</div>
            {txn.orchestrator_result
              ? <OrchestratorLine decision={txn.orchestrator_result}/>
              : <div className="text-muted text-sm">Not available</div>}
          </div>

          {/* ML output */}
          {prob !== null && (
            <div>
              <div className="drawer__section-hdr">ML prediction</div>
              <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:12}}>
                <div className={`prob-val ${probCls}`}>{(prob*100).toFixed(0)}%</div>
                <span className="text-muted text-sm">success probability</span>
              </div>
              <ShapBars contributions={txn.ml_result?.shap_contributions}/>
            </div>
          )}

          {/* Attempt history */}
          {txn.attempt_history?.length > 0 && (
            <div>
              <div className="drawer__section-hdr">Attempt timeline</div>
              <div className="timeline">
                {txn.attempt_history.map((a,i)=>(
                  <div key={i} className="tl-item">
                    <div className={`tl-dot tl-dot--${a.outcome==='success'?'success':a.outcome==='failed'?'fail':'pending'}`}>
                      {a.attempt_number}
                    </div>
                    <div>
                      <div className="tl-label">Attempt {a.attempt_number} — {a.outcome}</div>
                      <div className="tl-meta">
                        {a.timestamp && new Date(a.timestamp).toLocaleString('en-IN')}
                        {a.failure_reason && ` · ${a.failure_reason.replace(/_/g,' ')}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer message */}
          {txn.customer_message && (
            <div>
              <div className="drawer__section-hdr">Customer message</div>
              <div className="card card--padded" style={{fontSize:13,lineHeight:1.65,
                color:'var(--text-secondary)',fontStyle:'italic'}}>
                "{txn.customer_message}"
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <div className="drawer__section-hdr">Metadata</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                ['Failure reason', txn.failure_reason?.replace(/_/g,' ')],
                ['Payment method', txn.payment_method],
                ['Merchant',       txn.merchant_category?.replace(/_/g,' ')],
                ['Segment',        txn.customer_segment],
                ['Attempts',       `${txn.attempt_count} / ${txn.max_attempts}`],
                ['Is recurring',   txn.is_recurring?'Yes':'No'],
              ].map(([k,v])=>(
                <div key={k} style={{background:'var(--surface-el)',borderRadius:'var(--radius-sm)',padding:'10px 12px'}}>
                  <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:3,fontWeight:500}}>{k}</div>
                  <div style={{fontSize:13,color:'var(--text-primary)',fontWeight:500}}>{v||'—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

export default function TransactionsPage() {
  const [txns,    setTxns]    = useState([])
  const [status,  setStatus]  = useState('loading')
  const [selected,setSelected]= useState(null)
  const [statusF, setStatusF] = useState('all')
  const [reasonF, setReasonF] = useState('all')
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)
  const PAGE_SIZE = 50

  const load = useCallback(async()=>{
    try {
      const r = await fetch(`/api/transactions?page_size=${PAGE_SIZE}`)
      if(!r.ok) throw r
      const d = await r.json()
      setTxns(d.transactions||[])
      setStatus('ok')
    } catch {
      setStatus('waking')
      setTimeout(load,8000)
    }
  },[])

  useEffect(()=>{ load() },[load])

  const filtered = txns.filter(t=>{
    if(statusF!=='all' && t.status!==statusF) return false
    if(reasonF!=='all' && t.failure_reason!==reasonF) return false
    if(search && !t.transaction_id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="page" style={{paddingTop: selected ? 0 : undefined}}>
      <div className="container">
        <div className="page-hdr">
          <div className="eyebrow"><span className="eyebrow__dot"/>Transactions</div>
          <h1>Transaction feed</h1>
          {status==='ok' && <p className="page-hdr__sub">{txns.length} transactions loaded · click any row for full detail</p>}
        </div>

        {status==='loading' && <WakingUp/>}
        {status==='waking'  && <WakingUp/>}

        {status==='ok' && (<>
          {/* Filters */}
          <div className="filter-bar">
            {STATUS_FILTERS.map(f=>(
              <button key={f} className={`filter-pill${statusF===f?' active':''}`}
                onClick={()=>setStatusF(f)}>{f==='all'?'All statuses':f}</button>
            ))}
            <input className="search-input" placeholder="Search transaction ID…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>

          {/* Reason filters */}
          <div className="filter-bar" style={{marginBottom:24}}>
            {REASON_FILTERS.map(f=>(
              <button key={f} className={`filter-pill${reasonF===f?' active':''}`}
                onClick={()=>setReasonF(f)} style={{fontSize:11}}>
                {f==='all'?'All reasons':f.replace(/_/g,' ')}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="section">
            <div className="section-hdr">
              <span className="section-title">{filtered.length} transactions</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Failure</th>
                    <th>Method</th>
                    <th>Probability</th>
                    <th>Attempts</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length===0 && (
                    <tr><td colSpan={6}><div className="state-empty">No matching transactions</div></td></tr>
                  )}
                  {filtered.map(txn=>{
                    const prob = txn.ml_result?.success_probability
                    return (
                      <tr key={txn.transaction_id}
                        className={selected?.transaction_id===txn.transaction_id?'row-active':''}
                        onClick={()=>setSelected(txn)}>
                        <td>
                          <div className="text-mono">{txn.transaction_id.slice(0,18)}…</div>
                          <div className="text-muted text-xs" style={{marginTop:2}}>
                            {new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(txn.amount)}
                          </div>
                        </td>
                        <td><span className="badge badge--reason">{txn.failure_reason.replace(/_/g,' ')}</span></td>
                        <td className="text-muted text-sm">{txn.payment_method}</td>
                        <td>
                          {prob!=null ? (
                            <div className="prob-bar">
                              <div className="prob-bar__track">
                                <div className="prob-bar__fill" style={{width:`${prob*100}%`}}/>
                              </div>
                              <span className="text-xs text-muted">{(prob*100).toFixed(0)}%</span>
                            </div>
                          ) : <span className="text-muted text-xs">—</span>}
                        </td>
                        <td className="text-muted text-sm">{txn.attempt_count}/{txn.max_attempts}</td>
                        <td><StatusBadge status={txn.status}/></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>)}
      </div>

      {selected && <DetailDrawer txn={selected} onClose={()=>setSelected(null)}/>}
    </div>
  )
}
