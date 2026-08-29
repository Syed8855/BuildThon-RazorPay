'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts'

const ease = [0.22,1,0.36,1]
const fmtINR = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n??0)

// Consistent color palette — no rainbow, blue-first
const C_BLUE = '#5284FF'
const C_GOLD = '#F2B705'
const C_DIM  = '#737A8C'
const C_DARK = '#1A2040'

// Custom dark tooltip
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'var(--surface-el)',border:'1px solid var(--border-medium)',
      borderRadius:'var(--radius-sm)',padding:'10px 14px',fontSize:12,fontFamily:'var(--font)'}}>
      <div style={{fontWeight:600,color:'var(--text-primary)',marginBottom:4}}>{label}</div>
      {payload.map(p=>(
        <div key={p.dataKey} style={{color:'var(--text-secondary)'}}>
          {p.name}: <strong style={{color:'var(--text-primary)'}}>{typeof p.value==='number'&&p.value<10?p.value.toFixed(1):p.value}</strong>
        </div>
      ))}
    </div>
  )
}

function WakingUp() {
  const [d,setD]=useState('.')
  useEffect(()=>{const t=setInterval(()=>setD(x=>x.length>=3?'.':x+'.'),500);return()=>clearInterval(t)},[])
  return (
    <div className="state-loading">
      <div style={{fontSize:28}}>⚡</div>
      <div className="state-loading__title">Loading analytics{d}</div>
      <div className="state-loading__sub">Backend waking up — auto-refreshing in 8s</div>
      <div className="state-loading__bar"/>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data,   setData]   = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(()=>{
    const load = async () => {
      try {
        const d = await fetch('/api/analytics').then(r=>{ if(!r.ok)throw r; return r.json() })
        setData(d); setStatus('ok')
      } catch {
        setStatus('waking')
        setTimeout(load,8000)
      }
    }
    load()
  },[])

  if (status==='loading'||status==='waking') return (
    <div className="page"><div className="container"><WakingUp/></div></div>
  )
  if (!data) return null

  const { funnel, revenue, recovery_by_reason, recovery_by_attempt, global_feature_importance } = data

  const funnelData = [
    { name:'Total failed',  value:funnel.total_failed,  fill:C_DIM  },
    { name:'Hard-failed',   value:funnel.hard_failed,   fill:'#4A4A5E'},
    { name:'In retry',      value:funnel.retrying,      fill:C_BLUE  },
    { name:'Recovered',     value:funnel.recovered,     fill:C_GOLD  },
    { name:'Churned',       value:funnel.churned,       fill:'#3A3A4E'},
  ]

  const reasonData = Object.entries(recovery_by_reason||{})
    .map(([r,rate])=>({name:r.replace(/_/g,' '),rate:parseFloat((rate*100).toFixed(1))}) )
    .sort((a,b)=>b.rate-a.rate)

  const attemptData = (recovery_by_attempt||[]).map(r=>({
    name:`Attempt ${r.attempt_number}`,
    rate:parseFloat((r.recovery_rate*100).toFixed(1)),
    n:r.n_attempts,
  }))

  const fiData = (global_feature_importance||[]).slice(0,8).map(f=>({
    name:f.feature.replace(/_/g,' '),
    val:parseFloat((f.importance*100).toFixed(1)),
  }))

  return (
    <div className="page">
      <div className="container">
        <div className="page-hdr">
          <div className="eyebrow"><span className="eyebrow__dot"/>Analytics</div>
          <h1>Recovery analytics</h1>
          <p className="page-hdr__sub">Full-pipeline performance · all metrics from the same backend source</p>
        </div>

        {/* KPIs */}
        <motion.div className="metric-grid"
          initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.4,ease}}>
          {[
            {label:'Recovery rate',   value:`${((funnel.recovery_rate||0)*100).toFixed(1)}%`,cls:'metric-card__value--blue'},
            {label:'Revenue recovered',value:fmtINR(revenue.recovered||0),                   cls:'metric-card__value--gold'},
            {label:'Revenue at risk',  value:fmtINR(revenue.at_risk||0),                     cls:''},
            {label:'Churned',          value:funnel.churned,                                  cls:'metric-card__value--dim'},
          ].map((m,i)=>(
            <motion.div key={m.label} className="metric-card"
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
              transition={{delay:i*0.06,duration:0.35,ease}}>
              <div className="metric-card__label">{m.label}</div>
              <div className={`metric-card__value ${m.cls}`}>{m.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Funnel */}
        <motion.div className="section"
          initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1,duration:0.4,ease}}>
          <div className="section-hdr"><span className="section-title">Recovery funnel</span></div>
          <div className="card card--padded" style={{padding:'24px 24px 8px'}}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={funnelData} layout="vertical" margin={{left:8,right:48,top:4,bottom:4}}>
                <XAxis type="number" hide/>
                <YAxis type="category" dataKey="name" width={100}
                  tick={{fontSize:12,fill:C_DIM}} axisLine={false} tickLine={false}/>
                <Tooltip content={<DarkTooltip/>}/>
                <Bar dataKey="value" radius={[0,6,6,0]} maxBarSize={28}>
                  {funnelData.map(e=><Cell key={e.name} fill={e.fill}/>)}
                  <LabelList dataKey="value" position="right" style={{fill:'var(--text-muted)',fontSize:12,fontFamily:'var(--font)'}}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:20}}>

          {/* Recovery by reason */}
          <motion.div className="section"
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.16,duration:0.4,ease}}>
            <div className="section-hdr"><span className="section-title">Recovery by failure reason</span></div>
            <div className="card card--padded" style={{padding:'24px 24px 8px'}}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={reasonData} layout="vertical" margin={{left:8,right:48,top:4,bottom:4}}>
                  <XAxis type="number" unit="%" domain={[0,100]} tick={{fontSize:11,fill:C_DIM}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={120}
                    tick={{fontSize:11,fill:C_DIM}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<DarkTooltip/>}/>
                  <Bar dataKey="rate" fill={C_BLUE} radius={[0,5,5,0]} maxBarSize={22}>
                    <LabelList dataKey="rate" position="right" formatter={v=>`${v}%`}
                      style={{fill:'var(--text-muted)',fontSize:11,fontFamily:'var(--font)'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recovery by attempt */}
          <motion.div className="section"
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.22,duration:0.4,ease}}>
            <div className="section-hdr"><span className="section-title">Recovery rate by attempt</span></div>
            <div className="card card--padded" style={{padding:'24px 24px 8px'}}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={attemptData} margin={{left:0,right:16,top:4,bottom:4}}>
                  <XAxis dataKey="name" tick={{fontSize:11,fill:C_DIM}} axisLine={false} tickLine={false}/>
                  <YAxis unit="%" domain={[0,60]} tick={{fontSize:11,fill:C_DIM}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<DarkTooltip/>}/>
                  <Bar dataKey="rate" fill={C_GOLD} radius={[5,5,0,0]} maxBarSize={44}>
                    <LabelList dataKey="rate" position="top" formatter={v=>`${v}%`}
                      style={{fill:'var(--text-muted)',fontSize:11,fontFamily:'var(--font)'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-muted text-xs" style={{textAlign:'center',marginTop:8,marginBottom:8}}>
                Recovery rate declines monotonically with attempt — expected signal
              </p>
            </div>
          </motion.div>
        </div>

        {/* Feature importance */}
        {fiData.length>0 && (
          <motion.div className="section"
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.28,duration:0.4,ease}}>
            <div className="section-hdr">
              <span className="section-title">Global feature importance (XGBoost)</span>
            </div>
            <div className="card card--padded" style={{padding:'24px 24px 8px'}}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={fiData} layout="vertical" margin={{left:16,right:56,top:4,bottom:4}}>
                  <XAxis type="number" tick={{fontSize:11,fill:C_DIM}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" width={180}
                    tick={{fontSize:12,fill:C_DIM}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<DarkTooltip/>}/>
                  <Bar dataKey="val" radius={[0,6,6,0]} maxBarSize={26}>
                    {fiData.map((e,i)=><Cell key={e.name} fill={`hsl(${224+i*4},${70-i*3}%,${60-i*3}%)`}/>)}
                    <LabelList dataKey="val" position="right"
                      style={{fill:'var(--text-muted)',fontSize:12,fontFamily:'var(--font)'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
