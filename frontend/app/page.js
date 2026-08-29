'use client';
// Hero page — hero.md spec exactly.
// Background: deep Razorpay blue #072654 with subtle grid texture.
// Card animation: FlipCard component (payment failed → recovered).
// CTAs: "Try the demo" → /playground, "How it works" → /design-decisions
// Below fold: stat strip + 3 feature callouts.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import FlipCard from '@/components/FlipCard';

const FEATURES = [
  {
    icon: '🔄',
    title: 'Smart retries',
    desc: 'Escalating backoff schedule with ML-gated skips — never waste an attempt on a hopeless transaction.',
  },
  {
    icon: '🧠',
    title: 'Explainable AI',
    desc: 'Every prediction comes with SHAP contributions — merchants see exactly why the model made each call.',
  },
  {
    icon: '🛡️',
    title: 'Rule guardrails',
    desc: 'Hard-fail short-circuits, cycle cutoffs, and spacing rules fire before the model is ever consulted.',
  },
];

export default function HeroPage() {
  const [headlineVisible, setHeadlineVisible] = useState(false);

  // hero.md: headline reveals at 700-900ms, overlapping tail of flip
  useEffect(() => {
    const t = setTimeout(() => setHeadlineVisible(true), 750);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Hero section — deep Razorpay blue, hero.md §Layout */}
      <section style={{
        background: 'linear-gradient(135deg, #072654 0%, #0a3572 60%, #061d42 100%)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Subtle grid texture — hero.md "optional grid texture for depth" */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Accent glow blobs */}
        <div style={{
          position: 'absolute', top: '20%', right: '15%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(51,149,255,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', left: '10%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(242,183,5,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Content: card left, headline right on desktop */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 64,
          maxWidth: 960,
          width: '100%',
          position: 'relative',
          zIndex: 1,
          flexWrap: 'wrap',
        }}>

          {/* Card + sleeve animation — hero.md centerpiece */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlipCard scale="large" autoPlay={true} />
          </div>

          {/* Headline + subtext + CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={headlineVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ maxWidth: 480, textAlign: 'left' }}
          >
            {/* Razorpay brand pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(51,149,255,0.15)',
              border: '1px solid rgba(51,149,255,0.30)',
              borderRadius: 999,
              padding: '4px 14px',
              fontSize: 12, fontWeight: 600,
              color: '#4DA6FF',
              marginBottom: 24,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              ⚡ Built for Razorpay merchants
            </div>

            <h1 style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.15,
              marginBottom: 20,
            }}>
              Stop losing revenue to{' '}
              <span style={{ color: '#F2B705' }}>failed payments</span>
            </h1>

            <p style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.65,
              marginBottom: 36,
            }}>
              An explainable rules + ML system that predicts retry success,
              explains every decision, and recovers subscriptions automatically —
              without spamming issuers.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link href="/playground" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px',
                background: '#3395FF',
                color: '#fff',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
                transition: 'background 200ms, transform 200ms',
                boxShadow: '0 4px 20px rgba(51,149,255,0.35)',
              }}
              onMouseEnter={e => { e.target.style.background='#1a7fe0'; e.target.style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { e.target.style.background='#3395FF'; e.target.style.transform='translateY(0)'; }}
              >
                Try the demo →
              </Link>

              <Link href="/design-decisions" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.85)',
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 15,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.15)',
                transition: 'background 200ms',
              }}
              onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.14)'}
              onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.08)'}
              >
                How it works
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          style={{
            position: 'absolute', bottom: 32,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.30)', fontSize: 12,
          }}
        >
          <span>scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{ fontSize: 16 }}
          >↓</motion.div>
        </motion.div>
      </section>

      {/* ── Stat strip — hero.md §below-the-fold */}
      <section style={{
        background: '#fff',
        borderBottom: '1px solid #E2E6EB',
        padding: '32px 24px',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, flexWrap: 'wrap', textAlign: 'center',
        }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: '#3395FF' }}>20–40%</span>
          <span style={{ fontSize: 16, color: '#5C6470', maxWidth: 480, lineHeight: 1.5 }}>
            of subscription churn is payment-failure-driven, not customer choice —
            most of it is silently recoverable with the right retry strategy.
          </span>
        </div>
      </section>

      {/* ── Feature callouts — hero.md §3 icon+text callouts */}
      <section style={{
        background: '#F5F7FA',
        padding: '64px 24px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{
            textAlign: 'center', fontSize: 26, fontWeight: 600,
            color: '#0A0A0A', marginBottom: 48,
          }}>
            What makes this different
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
          }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4, ease: 'easeOut' }}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '28px 24px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                <span style={{ fontSize: 32 }}>{f.icon}</span>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: '#0A0A0A' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#5C6470', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA to dashboard */}
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/dashboard" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 32px',
              background: '#0A0A0A',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
            }}>
              View the dashboard →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
