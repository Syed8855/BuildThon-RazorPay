'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'

const fmtINR = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n??0)
const fmtNum = n => new Intl.NumberFormat('en-IN').format(n??0)
const ease   = [0.22,1,0.36,1]

/* ── Stickman pictogram ─────────────────────────────────────── */
function Stick({ color, size=20 }) {
  return (
    <svg width={size} height={size*1.65} viewBox="0 0 20 33" fill="none" style={{display:'block'}}>
      <circle cx="10" cy="5" r="4" fill={color}/>
      <line x1="10" y1="9" x2="10" y2="22" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="10" y1="14" x2="3"  y2="19" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="10" y1="14" x2="17" y2="19" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="10" y1="22" x2="5"  y2="31" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="10" y1="22" x2="15" y2="31" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  )
}

function PictoCol({ label, count=0, color, delay=0, N=1 }) {
  const figures = Math.max(1, Math.min(Math.round(count/N), 24))
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{display:'flex',flexWrap:'wrap-reverse',justifyContent:'center',
        gap:4,width:160,minHeight:100,alignContent:'flex-end'}}>
        {Array.from({length:figures}).map((_,i)=>(
          <motion.div key={i}
            initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
            transition={{delay:delay+Math.min(i*0.055,1.5),type:'spring',stiffness:300,damping:20}}>
            <Stick color={color} size={19}/>
          </motion.div>
        ))}
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:22,fontWeight:700,color,letterSpacing:'-0.03em'}}>{fmtNum(count)}</div>
        <div className="text-muted text-xs" style={{marginTop:3}}>{label}</div>
      </div>
    </div>
  )
}

/* ── Loading state ───────────────────────────────────────────── */
function WakingUp() {
  const [dots, setDots] = useState('.')
  useEffect(()=>{
    const t = setInterval(()=>setDots(d=>d.length>=3?'.':d+'.'),500)
    return()=>clearInterval(t)
  },[])
  return (
    <div className="state-loading">
      <div style={{fontSize:28}}>⚡</div>
      <div className="state-loading__title">Waking up backend{dots}</div>
      <div className="state-loading__sub">
        The server runs on Render's free tier — takes ~30s to cold-start.
        Data will load automatically.
      </div>
      <div className="state-loading__bar"/>
    </div>
  )
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState(null)
  const [txns,      setTxns]      = useState([])
  const [status,    setStatus]    = useState('loading') // loading | waking | ok | error

  const load = useCallback(async()=>{
    setStatus('loading')
    const start = Date.now()
    try {
      const [a,t] = await Promise.all([
        fetch('/api/analytics').then(r=>{ if(!r.ok)throw r; return r.json() }),
        fetch('/api/transactions?page=1&page_size=6').then(r=>{ if(!r.ok)throw r; return r.json() }),
      ])
      setAnalytics(a); setTxns(t.transactions||[])
      setStatus('ok')
    } catch {
      if(Date.now()-start > 5000) setStatus('waking')
      else setStatus('error')
      setTimeout(load, 8000) // auto-retry
    }
  },[])

  useEffect(()=>{ load() },[load])

  const f   = analytics?.funnel   || {}
  const rev = analytics?.revenue  || {}
  const maxN = Math.max(f.total_failed||1, f.retrying||0, f.recovered||0)
  const N = maxN > 200 ? 10 : maxN > 50 ? 5 : 1

  return (
    <div className="page">
      <div className="container">

        {/* Page header */}
        <div className="page-hdr">
          <div className="eyebrow"><span className="eyebrow__dot"/>Revenue Recovery</div>
          <h1>Dashboard</h1>
          {status==='ok' && <p className="page-hdr__sub">{fmtNum(f.total_failed)} transactions tracked · live data from backend</p>}
        </div>

        {/* Loading states */}
        {status==='loading' && <WakingUp/>}
        {status==='waking'  && <WakingUp/>}
        {status==='error'   && <div className="state-error">Could not reach backend. Retrying…</div>}

        {/* Content — only when ok */}
        {status==='ok' && (<>

          {/* KPI strip */}
          <div className="metric-grid">
            {[
              { label:'Recovery rate',   value:`${((f.recovery_rate||0)*100).toFixed(1)}%`,   cls:'metric-card__value--blue' },
              { label:'Revenue recovered',value:fmtINR(rev.recovered||0),                       cls:'metric-card__value--gold' },
              { label:'Active retries',  value:fmtNum(f.retrying),                              cls:'metric-card__value--blue' },
              { label:'Hard-failed',     value:fmtNum(f.hard_failed),                           cls:'metric-card__value--dim' },
            ].map(m=>(
              <motion.div key={m.label} className="metric-card"
                initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
                transition={{duration:0.4,ease}}>
                <div className="metric-card__label">{m.label}</div>
                <div className={`metric-card__value ${m.cls}`}>{m.value}</div>
              </motion.div>
            ))}
          </div>

          {/* Revenue at risk */}
          <motion.div className="section"
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1,duration:0.4,ease}}>
            <div className="card card--padded" style={{
              background:'linear-gradient(135deg,rgba(49,92,255,0.06) 0%,rgba(5,7,13,0) 100%)',
              borderColor:'rgba(82,132,255,0.18)',
              display:'flex',alignItems:'center',justifyContent:'space-between',gap:24
            }}>
              <div>
                <div style={{fontSize:12,fontWeight:500,color:'var(--text-muted)',letterSpacing:'0.06em',
                  textTransform:'uppercase',marginBottom:8}}>Revenue at risk</div>
                <div style={{fontSize:38,fontWeight:700,color:'var(--status-gold)',letterSpacing:'-0.04em',lineHeight:1}}>
                  {fmtINR(rev.at_risk||0)}
                </div>
                <div className="text-muted text-sm" style={{marginTop:8}}>
                  In-flight retry cycle — not yet recovered or permanently churned
                </div>
              </div>
              <div style={{fontSize:40,opacity:0.18}}>💰</div>
            </div>
          </motion.div>

          {/* Pictogram chart */}
          <motion.div className="section"
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.18,duration:0.4,ease}}>
            <div className="section-hdr">
              <span className="section-title">Recovery pictogram</span>
              <span className="text-muted text-xs">1 figure = {N} transaction{N!==1?'s':''}</span>
            </div>
            <div className="card card--padded" style={{
              display:'flex',justifyContent:'space-evenly',alignItems:'flex-end',
              flexWrap:'wrap',gap:32,padding:'40px 24px'
            }}>
              <PictoCol label="Hard-failed"       count={f.hard_failed||0} color="var(--text-secondary)" delay={0}    N={N}/>
              <PictoCol label="In retry cycle"    count={f.retrying||0}    color="var(--accent)"         delay={0.2}  N={N}/>
              <PictoCol label="Recovered"         count={f.recovered||0}   color="var(--status-gold)"    delay={0.4}  N={N}/>
            </div>
          </motion.div>

          {/* Recent activity */}
          <motion.div className="section"
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.24,duration:0.4,ease}}>
            <div className="section-hdr">
              <span className="section-title">Recent activity</span>
              <Link href="/transactions" className="section-action">View all →</Link>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Failure reason</th>
                    <th>Attempts</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.length===0 && (
                    <tr><td colSpan={4}><div className="state-empty">No transactions</div></td></tr>
                  )}
                  {txns.map(txn=>(
                    <tr key={txn.transaction_id} onClick={()=>window.location.href='/transactions'}>
                      <td>
                        <span className="text-mono">{txn.transaction_id.slice(0,16)}…</span>
                        <div className="text-muted text-xs" style={{marginTop:3}}>{fmtINR(txn.amount)}</div>
                      </td>
                      <td><span className="badge badge--reason">{txn.failure_reason.replace(/_/g,' ')}</span></td>
                      <td className="text-muted text-sm">{txn.attempt_count}/{txn.max_attempts}</td>
                      <td><StatusBadge status={txn.status}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

        </>)}
      </div>
    </div>
  )
}
