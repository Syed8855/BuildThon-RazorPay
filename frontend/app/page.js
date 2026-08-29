'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react'
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
    <div style={{ fontFamily: 'var(--font)', background: 'var(--bg-primary)', color: 'var(--text-primary)', position: 'relative' }}>
      
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
        {/* Subtle Ambient Glow */}
        <div
          style={{
            position: 'absolute',
            width: 'min(760px, 90vw)',
            height: 500,
            borderRadius: '50%',
            background:
              simStage === 'FAILED'
                ? 'radial-gradient(ellipse, rgba(155, 71, 71, 0.18) 0%, transparent 70%)'
                : simStage === 'RECOVERED'
                ? 'radial-gradient(ellipse, rgba(242, 183, 5, 0.22) 0%, transparent 70%)'
                : 'radial-gradient(ellipse, rgba(49, 92, 255, 0.16) 0%, transparent 70%)',
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
          padding: '90px 24px 48px',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        {/* Top Header Section */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          style={{ maxWidth: 680, pointerEvents: 'auto' }}
        >
          <div
            className="eyebrow"
            style={{
              marginBottom: 16,
              justifyContent: 'center',
              display: 'inline-flex',
            }}
          >
            <span className="eyebrow__dot" /> REVENUE RECOVERY
          </div>

          <h1
            style={{
              fontSize: 'clamp(44px, 5.5vw, 76px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              margin: '0 0 16px',
            }}
          >
            Recover more.<br />
            <span style={{ color: 'var(--text-secondary)' }}>Lose less.</span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px, 2vw, 18px)',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              margin: '0 auto',
              maxWidth: 480,
            }}
          >
            Turn failed payments into recovered revenue.
          </p>
        </motion.div>

        {/* Center Space Reserved for the 3D Cards & Floating Revenue Test */}
        <div style={{ margin: '36px 0', pointerEvents: 'auto', display: 'flex', justifyContent: 'center' }}>
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
            <Link href="/playground" className="btn btn-primary" style={{ height: 46, padding: '0 28px' }}>
              Launch Full Playground <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/dashboard" className="btn btn-secondary" style={{ height: 46, padding: '0 22px' }}>
              View Dashboard
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
            <span>Scroll to explore</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SCROLL 2 — HERO EXTENSION (Continuous Narrative)
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
          background: 'linear-gradient(180deg, transparent 0%, rgba(5,7,13,0.88) 40%, #05070D 100%)',
        }}
      >
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease }}
          style={{
            maxWidth: 820,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div className="eyebrow">
            <span className="eyebrow__dot" /> AUTONOMOUS OPTIMIZATION
          </div>

          <h2
            style={{
              fontSize: 'clamp(32px, 4.5vw, 56px)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Don't lose the payment. <br />
            <span style={{ color: 'var(--accent)' }}>Recover it.</span>
          </h2>

          <p
            style={{
              fontSize: 'clamp(17px, 1.9vw, 20px)',
              lineHeight: 1.65,
              color: 'var(--text-secondary)',
              margin: '0 auto',
              maxWidth: 620,
            }}
          >
            Every failed payment is an opportunity to recover revenue. Our explainable ML engine attempts the right recovery path automatically — without issuer friction or customer churn.
          </p>

          {/* Minimal 3-part tagline pills */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
              margin: '12px 0 16px',
            }}
          >
            {['Intelligent retries', 'Smart recovery', 'More successful payments'].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(82, 132, 255, 0.08)',
                  border: '1px solid rgba(82, 132, 255, 0.2)',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--accent)',
                }}
              >
                ✦ {tag}
              </div>
            ))}
          </div>

          {/* Direct CTA Buttons */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
            <Link href="/playground" className="btn btn-primary" style={{ height: 46, padding: '0 28px' }}>
              Interactive Simulation Playground <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/design-decisions" className="btn btn-secondary" style={{ height: 46, padding: '0 22px' }}>
              Explore Architecture & Decisions
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
