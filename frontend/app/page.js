'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'

const AlinmaHeroScene = dynamic(() => import('@/components/hero/AlinmaHeroScene'), {
  ssr: false,
  loading: () => null,
})

const ease = [0.22, 1, 0.36, 1]

export default function HeroPage() {
  const prefersReduced = useReducedMotion()

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
            width: 'min(700px, 90vw)',
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(49, 92, 255, 0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <AlinmaHeroScene prefersReduced={!!prefersReduced} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SCROLL 1 — HERO FACE
      ════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '100px 24px 48px',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        {/* Top Header Section */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease }}
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
              maxWidth: 460,
            }}
          >
            Turn failed payments into recovered revenue.
          </p>
        </motion.div>

        {/* Center Space Reserved for the 3D Cards */}
        <div style={{ height: '24vh' }} />

        {/* Bottom CTA & Scroll Indicator */}
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/playground" className="btn btn-primary" style={{ height: 46, padding: '0 28px' }}>
              Explore Revenue Recovery <ArrowRight className="w-4 h-4" />
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
          background: 'linear-gradient(180deg, transparent 0%, rgba(5,7,13,0.85) 40%, #05070D 100%)',
        }}
      >
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease }}
          style={{
            maxWidth: 780,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div className="eyebrow">
            <span className="eyebrow__dot" /> AUTONOMOUS OPTIMIZATION
          </div>

          <h2
            style={{
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Every failed payment is an opportunity to recover revenue.
          </h2>

          <p
            style={{
              fontSize: 'clamp(16px, 1.8vw, 19px)',
              lineHeight: 1.65,
              color: 'var(--text-secondary)',
              margin: '0 auto',
              maxWidth: 580,
            }}
          >
            Revenue Recovery intelligently identifies failed transactions and attempts the right recovery path automatically — without spamming issuers or degrading customer trust.
          </p>

          {/* Minimal 3-part tagline pills */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
              margin: '16px 0 24px',
            }}
          >
            {['Intelligent retries', 'Smart recovery', 'Higher authorization rates'].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(82, 132, 255, 0.08)',
                  border: '1px solid rgba(82, 132, 255, 0.18)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--accent)',
                }}
              >
                ✦ {tag}
              </div>
            ))}
          </div>

          {/* Direct CTA Button */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/playground" className="btn btn-primary" style={{ height: 46, padding: '0 28px' }}>
              Launch Simulation Playground <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/design-decisions" className="btn btn-secondary" style={{ height: 46, padding: '0 22px' }}>
              Read Design Decisions
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
