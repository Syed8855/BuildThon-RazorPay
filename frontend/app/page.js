'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, ShieldCheck, Cpu, Zap, CheckCircle2 } from 'lucide-react'

const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_030111_a9e15665-d379-4a7f-8116-695bbe452ad1.mp4'

const ease = [0.22, 1, 0.36, 1]

export default function HeroPage() {
  const prefersReduced = useReducedMotion()

  return (
    <div style={{ fontFamily: 'var(--font)', background: '#000000', color: 'var(--text-primary)', position: 'relative', overflowX: 'hidden' }}>

      {/* ═══════════════════════════════════════════════════════════
          SCROLL 1 — HERO: Full-screen Cinematic Video Background
      ════════════════════════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          background: '#000000',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        {/* ── Full-screen Video Background ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <video
            src={HERO_VIDEO_URL}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.9) contrast(1.08)',
            }}
          />

          {/* Cinematic lighting gradient overlays for optimal text contrast */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 75%, rgba(0,0,0,0.92) 100%)',
            }}
          />
        </div>

        {/* ── Bottom Text & Action Zone ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.68) 55%, transparent 100%)',
            padding: '120px 24px 48px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 26,
            textAlign: 'center',
          }}
        >
          {/* Eyebrow tag */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 18px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(82, 132, 255, 0.16)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(82, 132, 255, 0.35)',
              boxShadow: '0 0 24px rgba(49, 92, 255, 0.25)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.09em',
              color: '#A0B8FF',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5284FF', boxShadow: '0 0 8px #5284FF' }} />
            EXPLAINABLE AI RECOVERY ENGINE
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            style={{
              fontSize: 'clamp(46px, 6.4vw, 86px)',
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: '-0.04em',
              color: '#FFFFFF',
              margin: 0,
              textShadow: '0 4px 24px rgba(0,0,0,0.6)',
            }}
          >
            Recover more.<br />
            <span
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #5284FF 60%, #F2B705 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Lose less.
            </span>
          </motion.h1>

          {/* Sub-text */}
          <motion.p
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
            style={{
              fontSize: 'clamp(16px, 2.0vw, 20px)',
              lineHeight: 1.6,
              color: 'rgba(215, 222, 240, 0.92)',
              margin: 0,
              maxWidth: 580,
              textShadow: '0 2px 12px rgba(0,0,0,0.7)',
            }}
          >
            Turn failed payment declines into salvaged recurring revenue with zero issuer friction.
          </motion.p>

          {/* Stat pills */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.4, ease }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <div
              style={{
                background: 'rgba(11, 16, 29, 0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(82, 132, 255, 0.35)',
                borderRadius: 'var(--radius-pill)',
                padding: '8px 18px',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(49,92,255,0.2)',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5284FF', boxShadow: '0 0 10px #5284FF' }} />
              ⚡ 0.04s ML Inference
            </div>
            <div
              style={{
                background: 'rgba(11, 16, 29, 0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(242, 183, 5, 0.35)',
                borderRadius: 'var(--radius-pill)',
                padding: '8px 18px',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#F2B705',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(242,183,5,0.2)',
              }}
            >
              <CheckCircle2 size={15} />
              +86.4% Recovery Rate
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease }}
            style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <Link href="/playground" className="btn btn-primary" style={{ height: 48, padding: '0 32px', fontSize: 15 }} aria-label="Launch Simulation Playground">
              Launch Simulation Playground <ArrowRight size={17} />
            </Link>
            <Link href="/dashboard" className="btn btn-secondary" style={{ height: 48, padding: '0 24px', fontSize: 14 }} aria-label="View Executive Dashboard">
              Executive Dashboard
            </Link>
          </motion.div>

          {/* Scroll hint with animated bouncing motion cue */}
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'rgba(160, 168, 192, 0.85)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          >
            <span>Scroll to explore architecture</span>
            <ChevronDown size={16} color="#5284FF" />
          </motion.div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          SCROLL 2 â€” HERO EXTENSION (Continuous Story & Metric Cards)
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
          background: 'linear-gradient(180deg, #000000 0%, rgba(4,6,10,0.98) 35%, #04060A 100%)',
        }}
      >
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease }}
          style={{
            maxWidth: 880,
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
              fontSize: 'clamp(36px, 5.0vw, 64px)',
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Don't lose the payment. <br />
            <span style={{ background: 'linear-gradient(135deg, #5284FF 0%, #A0B8FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Recover it.
            </span>
          </h2>

          <p
            style={{
              fontSize: 'clamp(17px, 2.0vw, 21px)',
              lineHeight: 1.65,
              color: 'var(--text-secondary)',
              margin: '0 auto',
              maxWidth: 680,
            }}
          >
            Every failed payment is an opportunity to salvage ARR. Our hybrid rules + XGBoost ML engine attempts the right recovery path automatically â€” with zero customer churn.
          </p>

          {/* 3 Pillar Feature Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 18,
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
                  className="card card--padded card--hover"
                  style={{
                    textAlign: 'left',
                    background: 'rgba(11, 16, 29, 0.85)',
                    borderColor: 'rgba(82, 132, 255, 0.24)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <Icon className="w-6 h-6 text-accent mb-3" />
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{card.title}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>{card.desc}</div>
                </div>
              )
            })}
          </div>

          {/* Direct CTA Buttons */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
            <Link href="/playground" className="btn btn-primary" style={{ height: 48, padding: '0 32px', fontSize: 15 }}>
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

