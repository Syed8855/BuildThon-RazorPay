'use client'
// Hero page — Razorpay Revenue Recovery premium landing.
// GlobalNav is rendered by layout.js (transparent/fixed on this route).
// This page starts below the fixed nav (60px).

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'

const CardScene = dynamic(() => import('@/components/hero/CardScene'), {
  ssr: false,
  loading: () => null,
})

const ease = [0.22,1,0.36,1]

const METRICS = [
  { value:'₹48,250', label:'Recovered today'    },
  { value:'127',     label:'Payments recovered'  },
  { value:'86%',     label:'Recovery rate'       },
]

const STORY = [
  { icon:'✗', color:'var(--text-muted)',    text:'Payment failed'     },
  { icon:'⟳', color:'var(--accent)',        text:'Recovery triggered' },
  { icon:'✓', color:'var(--status-gold)',   text:'Payment recovered'  },
]

const FEATURES = [
  {
    icon:'🛡️', title:'Rule guardrails first',
    desc:'Hard-fail short-circuits, max-attempt caps, and spacing rules fire before the model — eliminating obvious failures at zero ML cost.',
  },
  {
    icon:'🧠', title:'ML where it matters',
    desc:'XGBoost predicts retry success probability for transient failures. Trained on 3,500+ transactions with perturbed-parameter OOD validation.',
  },
  {
    icon:'🔍', title:'Fully explainable',
    desc:'Every decision includes SHAP contributions. Your team sees exactly which features drove each retry call — no black boxes.',
  },
]

export default function HeroPage() {
  const prefersReduced = useReducedMotion()
  const [storyStep, setStoryStep] = useState(-1)

  useEffect(() => {
    if (prefersReduced) { setStoryStep(2); return }
    const t0 = setTimeout(() => setStoryStep(0), 3600)
    const t1 = setTimeout(() => setStoryStep(1), 4200)
    const t2 = setTimeout(() => setStoryStep(2), 4800)
    return () => [t0,t1,t2].forEach(clearTimeout)
  }, [prefersReduced])

  return (
    <div style={{ fontFamily:'var(--font)', background:'var(--bg-primary)', color:'var(--text-primary)' }}>

      {/* ── Hero section — full viewport, accounts for 60px fixed nav */}
      <section style={{
        position:'relative', minHeight:'100vh',
        display:'grid', gridTemplateColumns:'1fr 1fr',
        alignItems:'center', paddingTop:60, overflow:'hidden',
      }}>
        {/* Navy radial bg */}
        <div style={{
          position:'absolute', inset:0, zIndex:0,
          background:'radial-gradient(ellipse 80% 70% at 72% 50%, #080C18 0%, var(--bg-primary) 72%)',
          pointerEvents:'none',
        }}/>
        {/* Dot grid */}
        <div style={{
          position:'absolute', inset:0, zIndex:0,
          backgroundImage:'radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize:'40px 40px', pointerEvents:'none',
        }}/>

        {/* ── LEFT — copy */}
        <div style={{
          position:'relative', zIndex:10,
          padding:'0 52px', display:'flex', flexDirection:'column',
        }}>
          <motion.div
            initial={prefersReduced?false:{opacity:0,y:8}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.5,delay:0.4,ease}}
            className="eyebrow" style={{marginBottom:20}}>
            <span className="eyebrow__dot"/> Revenue Recovery
          </motion.div>

          <motion.h1
            initial={prefersReduced?false:{opacity:0,y:32}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.7,delay:0.5,ease}}
            style={{
              fontSize:'clamp(52px,5.5vw,88px)',
              fontWeight:700, lineHeight:1.0,
              letterSpacing:'-0.04em', color:'var(--text-primary)',
              marginBottom:20,
            }}>
            Recover more.<br/>
            <span style={{color:'var(--text-secondary)'}}>Lose less.</span>
          </motion.h1>

          <motion.p
            initial={prefersReduced?false:{opacity:0,y:16}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.6,delay:0.65,ease}}
            style={{
              fontSize:18, lineHeight:1.62,
              color:'var(--text-secondary)',
              marginBottom:36, maxWidth:440,
            }}>
            Automatically recover failed payments and turn missed
            transactions into revenue — with explainable AI,
            rule guardrails, and zero issuer friction.
          </motion.p>

          <motion.div
            initial={prefersReduced?false:{opacity:0,y:12}}
            animate={{opacity:1,y:0}}
            transition={{duration:0.5,delay:0.8,ease}}
            style={{display:'flex',gap:12,alignItems:'center',marginBottom:48,flexWrap:'wrap'}}>
            <Link href="/playground" className="btn btn-primary">
              Start recovering now →
            </Link>
            <Link href="/design-decisions" className="btn btn-secondary">
              See how it works
            </Link>
          </motion.div>

          {/* Metrics */}
          <motion.div
            initial={prefersReduced?false:{opacity:0}}
            animate={{opacity:1}}
            transition={{duration:0.6,delay:1.0}}
            style={{
              display:'flex', gap:0,
              borderTop:'1px solid var(--border)', paddingTop:24,
            }}>
            {METRICS.map((m,i)=>(
              <div key={m.label} style={{
                flex:1, paddingRight:24,
                borderRight:i<METRICS.length-1?'1px solid var(--border)':'none',
                marginRight:i<METRICS.length-1?24:0,
              }}>
                <div style={{fontSize:26,fontWeight:700,letterSpacing:'-0.03em',
                  lineHeight:1.1, marginBottom:4}}>{m.value}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{m.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── RIGHT — 3D canvas */}
        <div style={{position:'relative',height:'100vh',overflow:'hidden'}}>
          {/* Blue glow */}
          <div style={{
            position:'absolute', top:'50%', left:'40%',
            transform:'translate(-50%,-50%)',
            width:500, height:400, borderRadius:'50%',
            background:'radial-gradient(ellipse,rgba(49,92,255,0.16) 0%,transparent 70%)',
            pointerEvents:'none', zIndex:1,
          }}/>
          {/* R3F canvas */}
          <div style={{position:'absolute',inset:0,zIndex:2}}>
            <CardScene prefersReduced={!!prefersReduced}/>
          </div>
          {/* Recovery story overlay */}
          <div style={{
            position:'absolute', bottom:'22%', left:'8%',
            zIndex:20, display:'flex', flexDirection:'column', gap:8,
          }}>
            {STORY.map((s,i)=>(
              <motion.div key={s.text}
                initial={{opacity:0,x:-14}}
                animate={storyStep>=i?{opacity:1,x:0}:{opacity:0,x:-14}}
                transition={{duration:0.4,ease}}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  background:'rgba(5,7,13,0.75)',
                  backdropFilter:'blur(14px)',
                  border:'1px solid var(--border)',
                  borderRadius:'var(--radius-sm)',
                  padding:'9px 14px',
                }}>
                <span style={{fontSize:13,color:s.color,fontWeight:700,width:14,textAlign:'center'}}>{s.icon}</span>
                <span style={{fontSize:13,color:'var(--text-secondary)',fontWeight:500}}>{s.text}</span>
              </motion.div>
            ))}
            {storyStep>=2&&(
              <motion.div
                initial={{opacity:0,scale:0.94}}
                animate={{opacity:1,scale:1}}
                transition={{duration:0.5,delay:0.2,ease}}
                style={{
                  marginTop:4,
                  background:'rgba(242,183,5,0.09)',
                  border:'1px solid rgba(242,183,5,0.22)',
                  borderRadius:'var(--radius-sm)',
                  padding:'10px 14px',
                  display:'flex',alignItems:'center',gap:8,
                }}>
                <span style={{fontSize:16,color:'var(--status-gold)'}}>✦</span>
                <span style={{fontSize:15,fontWeight:700,color:'var(--status-gold)',letterSpacing:'-0.02em'}}>
                  ₹48,250 recovered
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.6}}
          style={{
            position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)',
            display:'flex', flexDirection:'column', alignItems:'center', gap:5,
            color:'var(--text-muted)', fontSize:11, zIndex:10,
          }}>
          <span style={{letterSpacing:'0.06em',textTransform:'uppercase'}}>scroll</span>
          <motion.span animate={{y:[0,5,0]}} transition={{repeat:Infinity,duration:1.6,ease:'easeInOut'}}>↓</motion.span>
        </motion.div>
      </section>

      {/* ── Below fold — feature callouts */}
      <section style={{
        background:'var(--bg-secondary)',
        borderTop:'1px solid var(--border)',
        padding:'80px 52px',
      }}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <motion.div className="eyebrow" style={{marginBottom:16}}
            initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}} transition={{duration:0.5,ease}}>
            <span className="eyebrow__dot"/> Why it works
          </motion.div>
          <motion.h2
            initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}}
            viewport={{once:true}} transition={{duration:0.5,delay:0.08,ease}}
            style={{fontSize:'clamp(28px,3.5vw,48px)',fontWeight:700,
              letterSpacing:'-0.03em',color:'var(--text-primary)',
              marginBottom:48,lineHeight:1.1}}>
            Not another brute-force retry.
          </motion.h2>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
            {FEATURES.map((f,i)=>(
              <motion.div key={f.title}
                className="card card--padded card--hover"
                initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}}
                viewport={{once:true}} transition={{delay:i*0.1,duration:0.45,ease}}>
                <div style={{fontSize:26,marginBottom:14}}>{f.icon}</div>
                <h3 style={{fontSize:16,fontWeight:600,letterSpacing:'-0.02em',marginBottom:10}}>{f.title}</h3>
                <p style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.65}}>{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{opacity:0}} whileInView={{opacity:1}}
            viewport={{once:true}} transition={{duration:0.5,delay:0.3}}
            style={{marginTop:48,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <Link href="/playground" className="btn btn-primary">Try the simulation →</Link>
            <Link href="/dashboard"  className="btn btn-secondary">View the dashboard</Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
