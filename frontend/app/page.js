'use client'
// Hero page — Razorpay Revenue Recovery premium landing
// Visual spec: almost-black (#05070D) with controlled blue illumination,
// Razorpay-style nav, 3D card + sleeve (R3F, dynamic import / no SSR),
// Framer Motion text reveal, metrics strip, recovery story sequence.

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

// Three.js canvas — no SSR
const CardScene = dynamic(() => import('@/components/hero/CardScene'), {
  ssr: false,
  loading: () => null,
})

/* ── Design tokens (scoped to hero) ─────────────────────────── */
const C = {
  bg:       '#05070D',
  bgNav:    'rgba(5,7,13,0.88)',
  navy:     '#080C18',
  text:     '#FFFFFF',
  muted:    '#A7ADBD',
  dimmed:   '#737A8C',
  blue:     '#5284FF',
  ctaBlue:  '#315CFF',
  glow:     'rgba(49,92,255,0.22)',
  border:   'rgba(255,255,255,0.08)',
}

const FONT = `'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

/* ── Nav links ───────────────────────────────────────────────── */
const NAV_LINKS = ['Payments','Banking+','Payroll','Engage','Partners','Resources','Pricing']

/* ── Metrics ─────────────────────────────────────────────────── */
const METRICS = [
  { value: '₹48,250',  label: 'Recovered today'    },
  { value: '127',      label: 'Payments recovered'  },
  { value: '86%',      label: 'Recovery rate'        },
]

/* ── Recovery story steps ────────────────────────────────────── */
const STORY = [
  { icon: '✗', color: '#737A8C', text: 'Payment failed'       },
  { icon: '→', color: C.blue,    text: 'Recovery triggered'    },
  { icon: '✓', color: '#F2B705', text: 'Payment recovered'     },
]

/* ── Easing presets ──────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1]  // custom cubic bezier — physical deceleration

export default function HeroPage() {
  const prefersReduced = useReducedMotion()
  const [cardDone, setCardDone] = useState(false)
  const [storyStep, setStoryStep] = useState(-1)
  const navRef = useRef()

  // Advance recovery story after card animation settles
  useEffect(() => {
    if (prefersReduced) { setCardDone(true); setStoryStep(2); return }
    const t0 = setTimeout(() => setCardDone(true), 3100)
    const t1 = setTimeout(() => setStoryStep(0),   3400)
    const t2 = setTimeout(() => setStoryStep(1),   3900)
    const t3 = setTimeout(() => setStoryStep(2),   4400)
    return () => [t0,t1,t2,t3].forEach(clearTimeout)
  }, [prefersReduced])

  // Nav background on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return
      navRef.current.style.background = window.scrollY > 40 ? C.bgNav : 'transparent'
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: '100vh', color: C.text, overflowX: 'hidden' }}>

      {/* ═══════════════════════════════════════════════════════
          NAVIGATION — Razorpay-style, full bleed
      ════════════════════════════════════════════════════════ */}
      <nav ref={navRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        display: 'flex', alignItems: 'center',
        padding: '0 44px', height: 60,
        background: 'transparent',
        borderBottom: `1px solid transparent`,
        backdropFilter: 'blur(0px)',
        transition: 'background 300ms ease, backdrop-filter 300ms ease',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          fontFamily: FONT, fontSize: 20, fontWeight: 700,
          color: C.text, textDecoration: 'none', letterSpacing: '-0.02em',
          marginRight: 40, flexShrink: 0,
        }}>
          Razorpay
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV_LINKS.map(l => (
            <button key={l} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 500, color: C.muted, fontFamily: FONT,
              padding: '0 14px', height: 60,
              transition: 'color 200ms',
            }}
            onMouseEnter={e => e.target.style.color = C.text}
            onMouseLeave={e => e.target.style.color = C.muted}
            >{l}</button>
          ))}
        </div>

        {/* Auth CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 500, color: C.muted, fontFamily: FONT,
            padding: '8px 16px', borderRadius: 6,
            transition: 'color 200ms',
          }}
          onMouseEnter={e => e.target.style.color = C.text}
          onMouseLeave={e => e.target.style.color = C.muted}
          >Log in</button>
          <Link href="/dashboard" style={{
            fontSize: 14, fontWeight: 600, color: C.text,
            background: C.ctaBlue,
            padding: '8px 18px', borderRadius: 6,
            textDecoration: 'none',
            boxShadow: `0 2px 12px rgba(49,92,255,0.30)`,
            transition: 'background 200ms, box-shadow 200ms',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => { e.target.style.background='#1E44E8'; e.target.style.boxShadow='0 4px 20px rgba(49,92,255,0.45)' }}
          onMouseLeave={e => { e.target.style.background=C.ctaBlue; e.target.style.boxShadow='0 2px 12px rgba(49,92,255,0.30)' }}
          >Sign Up →</Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          HERO SECTION — full viewport
      ════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'center',
        paddingTop: 60,
        overflow: 'hidden',
      }}>
        {/* Background navy gradient — subtle, not bright */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: `radial-gradient(ellipse 80% 60% at 70% 50%, ${C.navy} 0%, ${C.bg} 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Very subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        {/* ── LEFT — copy + CTAs ───────────────────────────────── */}
        <div style={{
          position: 'relative', zIndex: 10,
          padding: '0 52px 0 52px',
          display: 'flex', flexDirection: 'column', gap: 0,
        }}>
          {/* Eyebrow */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease }}
            style={{
              fontSize: 13, fontWeight: 500, letterSpacing: '0.09em',
              color: C.blue, textTransform: 'uppercase',
              marginBottom: 22,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: C.blue,
              boxShadow: `0 0 8px ${C.blue}`,
              display: 'inline-block',
            }} />
            Revenue Recovery
          </motion.div>

          {/* Main heading */}
          <div style={{ marginBottom: 24, overflow: 'hidden' }}>
            <motion.h1
              initial={prefersReduced ? false : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease }}
              style={{
                fontSize: 'clamp(52px, 5.5vw, 88px)',
                fontWeight: 700,
                lineHeight: 1.0,
                letterSpacing: '-0.04em',
                color: C.text,
                margin: 0,
              }}
            >
              Recover more.<br />
              <span style={{ color: C.muted }}>Lose less.</span>
            </motion.h1>
          </div>

          {/* Body copy */}
          <motion.p
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease }}
            style={{
              fontSize: 18, lineHeight: 1.62,
              color: C.muted, margin: 0, marginBottom: 36,
              maxWidth: 440,
            }}
          >
            Automatically recover failed payments and turn missed
            transactions into revenue — with explainable AI, rule
            guardrails, and zero issuer friction.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55, ease }}
            style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 48, flexWrap: 'wrap' }}
          >
            <Link href="/playground" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 26px',
              background: C.ctaBlue,
              color: '#FFFFFF',
              borderRadius: 7, fontWeight: 600, fontSize: 15,
              textDecoration: 'none', letterSpacing: '-0.01em',
              boxShadow: `0 4px 24px rgba(49,92,255,0.32)`,
              transition: 'all 200ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#2040C8'; e.currentTarget.style.boxShadow='0 6px 32px rgba(49,92,255,0.5)'; e.currentTarget.style.transform='translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background=C.ctaBlue; e.currentTarget.style.boxShadow='0 4px 24px rgba(49,92,255,0.32)'; e.currentTarget.style.transform='translateY(0)' }}
            >
              Start recovering now →
            </Link>

            <Link href="/design-decisions" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '13px 22px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${C.border}`,
              color: C.muted,
              borderRadius: 7, fontWeight: 500, fontSize: 15,
              textDecoration: 'none', letterSpacing: '-0.01em',
              transition: 'all 200ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.09)'; e.currentTarget.style.color=C.text }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color=C.muted }}
            >
              See how it works
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                border: `1.5px solid ${C.dimmed}`,
                display: 'inline-block', flexShrink: 0,
              }} />
            </Link>
          </motion.div>

          {/* Metrics strip */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            style={{
              display: 'flex', gap: 0,
              borderTop: `1px solid ${C.border}`,
              paddingTop: 24,
            }}
          >
            {METRICS.map((m, i) => (
              <div key={m.label} style={{
                flex: 1,
                paddingRight: 24,
                borderRight: i < METRICS.length - 1 ? `1px solid ${C.border}` : 'none',
                marginRight: i < METRICS.length - 1 ? 24 : 0,
              }}>
                <div style={{
                  fontSize: 26, fontWeight: 700, color: C.text,
                  letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 4,
                }}>{m.value}</div>
                <div style={{ fontSize: 13, color: C.dimmed }}>{m.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── RIGHT — 3D card canvas ──────────────────────────── */}
        <div style={{
          position: 'relative', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Subtle blue atmospheric glow behind card */}
          <div style={{
            position: 'absolute',
            width: 480, height: 380,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, rgba(49,92,255,0.18) 0%, transparent 72%)`,
            pointerEvents: 'none',
            zIndex: 1,
          }} />

          {/* R3F Canvas — fills this column */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
            <CardScene prefersReduced={!!prefersReduced} />
          </div>

          {/* Recovery story overlay — appears after card settles */}
          {storyStep >= 0 && (
            <div style={{
              position: 'absolute',
              bottom: '22%', left: '8%',
              zIndex: 20,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {STORY.map((s, i) => (
                <motion.div
                  key={s.text}
                  initial={{ opacity: 0, x: -12 }}
                  animate={storyStep >= i ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
                  transition={{ duration: 0.4, ease }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(5,7,13,0.7)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: '9px 14px',
                  }}
                >
                  <span style={{ fontSize: 14, color: s.color, fontWeight: 700, width: 16, textAlign: 'center' }}>{s.icon}</span>
                  <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{s.text}</span>
                </motion.div>
              ))}
              {/* Recovered highlight */}
              {storyStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, ease }}
                  style={{
                    marginTop: 4,
                    background: 'rgba(242,183,5,0.10)',
                    border: '1px solid rgba(242,183,5,0.25)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span style={{ fontSize: 18 }}>✦</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#F2B705', letterSpacing: '-0.02em' }}>₹48,250 recovered</span>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          BELOW-FOLD — Feature callouts (lazy-revealed)
      ════════════════════════════════════════════════════════ */}
      <section style={{
        background: C.navy,
        borderTop: `1px solid ${C.border}`,
        padding: '80px 52px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease }}
            style={{
              fontSize: 13, fontWeight: 500, letterSpacing: '0.09em',
              color: C.blue, textTransform: 'uppercase', marginBottom: 16,
            }}
          >
            Why it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08, ease }}
            style={{
              fontSize: 'clamp(32px, 3.5vw, 48px)',
              fontWeight: 700, letterSpacing: '-0.03em',
              color: C.text, marginBottom: 56, lineHeight: 1.1,
            }}
          >
            Not another brute-force retry.
          </motion.h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {[
              {
                icon: '🛡️',
                title: 'Rule guardrails first',
                desc: 'Hard-fail short-circuits, max-attempt caps, and minimum spacing rules fire before the model is ever consulted — eliminating obvious non-recoveries at zero ML cost.',
                accent: C.blue,
              },
              {
                icon: '🧠',
                title: 'ML where it matters',
                desc: 'XGBoost model predicts retry success probability for every transient failure. Trained on 3,500+ synthetic transactions with Kaggle-calibrated amount distributions.',
                accent: '#F2B705',
              },
              {
                icon: '🔍',
                title: 'Fully explainable',
                desc: 'Every prediction comes with SHAP contributions — your team sees exactly which features drove each retry decision. No black boxes in a compliance-sensitive context.',
                accent: C.blue,
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: '28px 26px',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{
                  fontSize: 17, fontWeight: 600, color: C.text,
                  letterSpacing: '-0.02em', marginBottom: 12,
                }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ marginTop: 56, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Link href="/playground" style={{
              padding: '12px 26px', background: C.ctaBlue, color: '#fff',
              borderRadius: 7, fontWeight: 600, fontSize: 15, textDecoration: 'none',
              letterSpacing: '-0.01em',
              boxShadow: '0 4px 20px rgba(49,92,255,0.28)',
            }}>
              Try the simulation →
            </Link>
            <Link href="/dashboard" style={{
              padding: '12px 22px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${C.border}`,
              color: C.muted, borderRadius: 7, fontWeight: 500,
              fontSize: 15, textDecoration: 'none',
            }}>
              View the dashboard
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
