'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, RefreshCw, Shield, Brain, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'

const AlinmaHeroScene = dynamic(() => import('@/components/hero/AlinmaHeroScene'), {
  ssr: false,
  loading: () => null,
})

const ease = [0.22, 1, 0.36, 1]

const METRICS = [
  { value: '₹48,250', label: 'Recovered today' },
  { value: '127', label: 'Payments recovered' },
  { value: '86%', label: 'Recovery rate' },
]

const FEATURES = [
  {
    icon: <Shield className="w-6 h-6 text-accent" />,
    title: 'Rule guardrails first',
    desc: 'Hard-fail short-circuits, max-attempt caps, and spacing rules fire before the model — eliminating impossible retries at zero computational cost.',
  },
  {
    icon: <Brain className="w-6 h-6 text-[#7C8FFF]" />,
    title: 'ML where it matters',
    desc: 'XGBoost predicts retry success probability for transient failures. Trained on 3,500+ transactions with perturbed-parameter out-of-distribution validation.',
  },
  {
    icon: <Sparkles className="w-6 h-6 text-accent" />,
    title: 'Fully explainable',
    desc: 'Every decision includes exact SHAP contributions. Your team sees precisely which features drove each retry call with zero black boxes.',
  },
]

export default function HeroPage() {
  const prefersReduced = useReducedMotion()
  const [txState, setTxState] = useState('idle') // idle | processing | failed | engine | recovered
  const [tickerAmount, setTickerAmount] = useState(0)

  // Interactive transaction sequence trigger
  const runTransactionSimulation = () => {
    setTxState('processing')
    setTickerAmount(0)

    setTimeout(() => {
      setTxState('failed')
    }, 1400)

    setTimeout(() => {
      setTxState('engine')
    }, 2800)

    setTimeout(() => {
      setTxState('recovered')
      // Count up ticker
      let curr = 0
      const target = 2499
      const step = 85
      const interval = setInterval(() => {
        curr += step
        if (curr >= target) {
          setTickerAmount(target)
          clearInterval(interval)
        } else {
          setTickerAmount(curr)
        }
      }, 25)
    }, 4200)
  }

  // Run initial demo on mount
  useEffect(() => {
    if (prefersReduced) {
      setTxState('recovered')
      setTickerAmount(2499)
      return
    }
    const timer = setTimeout(() => {
      runTransactionSimulation()
    }, 1200)
    return () => clearTimeout(timer)
  }, [prefersReduced])

  return (
    <div style={{ fontFamily: 'var(--font)', background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      {/* ── Hero section ────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: 'minmax(420px, 1fr) 1.25fr',
          alignItems: 'center',
          paddingTop: 60,
          overflow: 'hidden',
        }}
      >
        {/* Deep Navy Atmosphere Background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: 'radial-gradient(ellipse 85% 75% at 75% 45%, #080C18 0%, var(--bg-primary) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Micro Isometric Grid Texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.028) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            pointerEvents: 'none',
          }}
        />

        {/* ── LEFT — Copy & Hero Action ───────────────────────────── */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '40px 48px 40px 56px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Eyebrow */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
            className="eyebrow"
            style={{ marginBottom: 20 }}
          >
            <span className="eyebrow__dot" /> REVENUE RECOVERY
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={prefersReduced ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease }}
            style={{
              fontSize: 'clamp(52px, 5.5vw, 84px)',
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              marginBottom: 20,
            }}
          >
            Recover more.<br />
            <span style={{ color: 'var(--text-secondary)' }}>Lose less.</span>
          </motion.h1>

          {/* Body */}
          <motion.p
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease }}
            style={{
              fontSize: 18,
              lineHeight: 1.62,
              color: 'var(--text-secondary)',
              marginBottom: 36,
              maxWidth: 460,
            }}
          >
            Automatically recover failed payments and turn missed transactions
            into revenue — with explainable AI, rule guardrails, and zero issuer friction.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65, ease }}
            style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 48, flexWrap: 'wrap' }}
          >
            <Link href="/playground" className="btn btn-primary" style={{ padding: '0 28px', height: 46 }}>
              Start recovering now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/design-decisions" className="btn btn-secondary" style={{ height: 46 }}>
              See how it works
            </Link>
          </motion.div>

          {/* Metrics Strip */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            style={{
              display: 'flex',
              gap: 0,
              borderTop: '1px solid var(--border)',
              paddingTop: 24,
            }}
          >
            {METRICS.map((m, i) => (
              <div
                key={m.label}
                style={{
                  flex: 1,
                  paddingRight: 24,
                  borderRight: i < METRICS.length - 1 ? '1px solid var(--border)' : 'none',
                  marginRight: i < METRICS.length - 1 ? 24 : 0,
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1,
                    marginBottom: 4,
                  }}
                >
                  {m.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── RIGHT — Alinma 3D Composition & Live Transaction State ── */}
        <div style={{ position: 'relative', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Atmospheric Electric Blue Glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 580,
              height: 460,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(49,92,255,0.18) 0%, transparent 72%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* 3D Arched Cards Canvas */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
            <AlinmaHeroScene txState={txState} prefersReduced={!!prefersReduced} />
          </div>

          {/* Floating Transaction State HUD Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '14%',
              right: '8%',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxWidth: 320,
              width: '100%',
            }}
          >
            {/* Live Interactive Status Card */}
            <div
              style={{
                background: 'rgba(11, 16, 28, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 18px',
                boxShadow: 'var(--shadow-card), 0 0 30px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  TRANSACTION STATE
                </span>
                <button
                  onClick={runTransactionSimulation}
                  disabled={txState === 'processing' || txState === 'failed' || txState === 'engine'}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    opacity: txState === 'recovered' || txState === 'idle' ? 1 : 0.4,
                  }}
                >
                  <RefreshCw className="w-3 h-3" /> Replay
                </button>
              </div>

              {/* State Transitions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Step 1: Processing */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: txState === 'processing' ? '#5284FF' : 'var(--text-muted)',
                    fontWeight: txState === 'processing' ? 600 : 400,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: txState === 'processing' ? '#5284FF' : 'rgba(255,255,255,0.15)' }} />
                  PAYMENT PROCESSING
                </div>

                {/* Step 2: Failed */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: txState === 'failed' ? '#C97070' : 'var(--text-muted)',
                    fontWeight: txState === 'failed' ? 600 : 400,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: txState === 'failed' ? '#C97070' : 'rgba(255,255,255,0.15)' }} />
                  PAYMENT FAILED (INSUFFICIENT FUNDS)
                </div>

                {/* Step 3: Recovery Engine */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: txState === 'engine' ? '#7C8FFF' : 'var(--text-muted)',
                    fontWeight: txState === 'engine' ? 600 : 400,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: txState === 'engine' ? '#7C8FFF' : 'rgba(255,255,255,0.15)' }} />
                  RECOVERY ENGINE EVALUATION
                </div>

                {/* Step 4: Recovered */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: txState === 'recovered' ? '#4F6FFF' : 'var(--text-muted)',
                    fontWeight: txState === 'recovered' ? 600 : 400,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: txState === 'recovered' ? '#4F6FFF' : 'rgba(255,255,255,0.15)' }} />
                  PAYMENT RECOVERED (OPTIMAL BACKOFF)
                </div>
              </div>

              {/* Step 5: Ticker Highlight */}
              {txState === 'recovered' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease }}
                  style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: 'rgba(79, 111, 255, 0.12)',
                    border: '1px solid rgba(79, 111, 255, 0.28)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 className="w-4 h-4 text-[#7C8FFF]" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Recovered</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    ₹{tickerAmount.toLocaleString('en-IN')}
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Below Fold — Why It Works ──────────────────────────────── */}
      <section
        style={{
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border)',
          padding: '88px 56px',
        }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <motion.div
            className="eyebrow"
            style={{ marginBottom: 16 }}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
          >
            <span className="eyebrow__dot" /> WHY IT WORKS
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08, ease }}
            style={{
              fontSize: 'clamp(32px, 4vw, 48px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: 48,
              lineHeight: 1.1,
            }}
          >
            Not another brute-force retry.
          </motion.h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="card card--padded card--hover"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.45, ease }}
              >
                <div style={{ marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ marginTop: 52, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Link href="/playground" className="btn btn-primary">
              Try the simulation →
            </Link>
            <Link href="/dashboard" className="btn btn-secondary">
              View the dashboard
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
