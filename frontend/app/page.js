'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, ShieldCheck, Cpu, Zap, Activity } from 'lucide-react'
import FloatingRevenueTest from '@/components/hero/FloatingRevenueTest'

const AlinmaHeroScene = dynamic(() => import('@/components/hero/AlinmaHeroScene'), {
  ssr: false,
  loading: () => null,
})

const ease = [0.22, 1, 0.36, 1]

export default function HeroPage() {
  const prefersReduced = useReducedMotion()
  const [simStage, setSimStage] = useState('IDLE')

  return (
    <div style={{ fontFamily: 'var(--font)', background: 'transparent', color: 'var(--text-primary)', position: 'relative' }}>
      
      {/* ── Fixed Centered 3D Card Layer (Visible across both scrolls) ── */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          pointerEvents: 'none', // Critical: Never intercept navigation or clicks
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Cinematic Radial Ambient Light Glow */}
        <div
          style={{
            position: 'absolute',
            width: 'min(840px, 92vw)',
            height: 540,
            borderRadius: '50%',
            background:
              simStage === 'FAILED'
                ? 'radial-gradient(ellipse, rgba(201, 90, 90, 0.22) 0%, transparent 70%)'
                : simStage === 'RECOVERED'
                ? 'radial-gradient(ellipse, rgba(242, 183, 5, 0.28) 0%, transparent 70%)'
                : 'radial-gradient(ellipse, rgba(49, 92, 255, 0.22) 0%, transparent 70%)',
            transition: 'background 800ms ease',
            pointerEvents: 'none',
          }}
        />
        <AlinmaHeroScene prefersReduced={!!prefersReduced} simStage={simStage} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SCROLL 1 — HERO FACE & FLOATING REVENUE TEST
      ════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '94px 24px 48px',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        {/* Top Header Section */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          style={{ maxWidth: 740, pointerEvents: 'auto' }}
        >
          <div
            className="eyebrow"
            style={{
              marginBottom: 16,
              justifyContent: 'center',
              display: 'inline-flex',
              padding: '6px 16px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(82, 132, 255, 0.10)',
              border: '1px solid rgba(82, 132, 255, 0.22)',
            }}
          >
            <span className="eyebrow__dot" /> EXPLAINABLE AI RECOVERY ENGINE
          </div>

          <h1
            style={{
              fontSize: 'clamp(46px, 5.8vw, 82px)',
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              margin: '0 0 16px',
            }}
          >
            Recover more.<br />
            <span style={{ background: 'linear-gradient(135deg, #5284FF 0%, #A0B8FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Lose less.
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(17px, 2.1vw, 20px)',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              margin: '0 auto',
              maxWidth: 520,
            }}
          >
            Turn failed payment declines into salvaged recurring revenue with zero issuer friction.
          </p>
        </motion.div>

        {/* Center Floating Revenue Test Cockpit */}
        <div style={{ margin: '32px 0', pointerEvents: 'auto', display: 'flex', justifyContent: 'center' }}>
          <FloatingRevenueTest onStageChange={(stage) => setSimStage(stage)} />
        </div>

        {/* Bottom CTA & Scroll Indicator */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/playground" className="btn btn-primary" style={{ height: 48, padding: '0 30px', fontSize: 15 }}>
              Launch Simulation Playground <ArrowRight className="w-4.5 h-4.5" />
            </Link>
            <Link href="/dashboard" className="btn btn-secondary" style={{ height: 48, padding: '0 24px', fontSize: 14 }}>
              Executive Dashboard
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span>Scroll to explore architecture</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SCROLL 2 — HERO EXTENSION (Continuous Story & Metric Cards)
      ════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '120px 24px',
          zIndex: 10,
          textAlign: 'center',
          background: 'linear-gradient(180deg, transparent 0%, rgba(4,6,10,0.92) 35%, #04060A 100%)',
        }}
      >
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease }}
          style={{
            maxWidth: 860,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
          }}
        >
          <div className="eyebrow">
            <span className="eyebrow__dot" /> AUTONOMOUS RECOVERY INTELLIGENCE
          </div>

          <h2
            style={{
              fontSize: 'clamp(34px, 4.8vw, 60px)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Don't lose the payment. <br />
            <span style={{ color: 'var(--accent-bright)' }}>Recover it.</span>
          </h2>

          <p
            style={{
              fontSize: 'clamp(17px, 2.0vw, 21px)',
              lineHeight: 1.65,
              color: 'var(--text-secondary)',
              margin: '0 auto',
              maxWidth: 660,
            }}
          >
            Every failed payment is an opportunity to salvage ARR. Our hybrid rules + XGBoost ML engine attempts the right recovery path automatically — with zero customer churn.
          </p>

          {/* 3 Pillar Feature Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              width: '100%',
              marginTop: 12,
            }}
          >
            {[
              { title: 'Intelligent Retries', desc: 'Payday & spacing aware scheduling eliminating hard fails.', icon: Cpu },
              { title: 'Explainable AI', desc: 'TreeExplainer SHAP attribution on every prediction.', icon: ShieldCheck },
              { title: 'Higher Auth Rates', desc: '+86% transient recovery rate without issuer friction.', icon: Zap },
            ].map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  className="card card--padded"
                  style={{
                    textAlign: 'left',
                    background: 'rgba(11, 16, 29, 0.82)',
                    borderColor: 'rgba(82, 132, 255, 0.2)',
                  }}
                >
                  <Icon className="w-6 h-6 text-accent mb-3" />
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{card.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{card.desc}</div>
                </div>
              )
            })}
          </div>

          {/* Direct CTA Buttons */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
            <Link href="/playground" className="btn btn-primary" style={{ height: 48, padding: '0 30px', fontSize: 15 }}>
              Interactive Simulation Playground <ArrowRight className="w-4.5 h-4.5" />
            </Link>
            <Link href="/design-decisions" className="btn btn-secondary" style={{ height: 48, padding: '0 24px', fontSize: 14 }}>
              Explore Architecture & Decisions
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
