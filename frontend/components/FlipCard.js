'use client';
// FlipCard — hero.md exact animation sequence:
// 1. Initial: card in sleeve, "Payment Failed" front face visible
// 2. Slide out (0-400ms) translateY + slight rotate
// 3. Pause (400-500ms)
// 4. 180° flip (500-900ms) rotateY: 0→180, backface-visibility hidden on both faces
// 5. Settle (900-1000ms) — scale bounce 1→1.03→1
// 6. Headline reveal: fade+slide in at 700-900ms mark
//
// prefers-reduced-motion: skip to settled "Recovered" with simple fade.
// Reused in Playground with scale="small".

import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';

export default function FlipCard({ scale = 'large', probability = null, autoPlay = true }) {
  const controls = useAnimation();
  const [flipped, setFlipped] = useState(false);
  const prefersReduced = useReducedMotion();

  // Derive flip state from probability when used in playground
  // probability null → run hero sequence; probability number → flip if > 0.5
  const shouldFlip = probability !== null ? probability > 0.5 : true;

  const cardW = scale === 'large' ? 280 : 180;
  const cardH = scale === 'large' ? 170 : 110;
  const sleeveH = scale === 'large' ? 80 : 50;

  useEffect(() => {
    if (!autoPlay) {
      // Playground mode: reflect probability immediately with 500ms flip
      if (probability !== null) {
        setFlipped(probability > 0.5);
      }
      return;
    }

    if (prefersReduced) {
      setFlipped(true);
      return;
    }

    const run = async () => {
      // Sequence exactly per hero.md
      await controls.start({ y: -cardH * 0.7, rotate: -3, transition: { duration: 0.4, ease: 'easeOut' } });
      await new Promise(r => setTimeout(r, 100)); // 400-500ms pause
      setFlipped(true);
      await controls.start({ scale: 1.03, transition: { duration: 0.1, delay: 0.4, ease: 'easeIn' } });
      await controls.start({ scale: 1.0, transition: { duration: 0.1, ease: 'easeOut' } });
    };

    const timeout = setTimeout(run, 200); // slight delay before starting
    return () => clearTimeout(timeout);
  }, [autoPlay, probability, prefersReduced]);

  const faceStyle = {
    position: 'absolute', inset: 0,
    borderRadius: 16,
    display: 'flex', flexDirection: 'column',
    alignItems: 'flex-start', justifyContent: 'flex-end',
    padding: scale === 'large' ? '20px 24px' : '12px 16px',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };

  return (
    <div style={{ position: 'relative', width: cardW, height: cardH + sleeveH }}>
      {/* Sleeve */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: sleeveH + 16,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        zIndex: 0,
      }} />

      {/* Card */}
      <motion.div
        animate={controls}
        style={{
          position: 'absolute', top: 0, left: 0,
          width: cardW, height: cardH,
          perspective: 800,
          zIndex: 1,
        }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={prefersReduced
            ? { duration: 0 }
            : { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
          }
          style={{
            width: '100%', height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front — Payment Failed */}
          <div style={{
            ...faceStyle,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <div style={{ marginBottom: 'auto', paddingTop: scale === 'large' ? 20 : 12 }}>
              <span style={{ fontSize: scale === 'large' ? 28 : 18 }}>✗</span>
            </div>
            <div>
              <div style={{
                fontSize: scale === 'large' ? 18 : 13,
                fontWeight: 700, color: '#fff', lineHeight: 1.2,
              }}>Payment failed</div>
              <div style={{
                fontSize: scale === 'large' ? 13 : 11,
                color: 'rgba(255,255,255,0.5)', marginTop: 4,
              }}>Insufficient funds · auto-retry pending</div>
            </div>
          </div>

          {/* Back — Recovered */}
          <div style={{
            ...faceStyle,
            background: 'linear-gradient(135deg, #1a1a00 0%, #2a2200 100%)',
            border: '1px solid rgba(242,183,5,0.30)',
            boxShadow: '0 8px 32px rgba(242,183,5,0.15)',
            transform: 'rotateY(180deg)',
          }}>
            <div style={{ marginBottom: 'auto', paddingTop: scale === 'large' ? 20 : 12 }}>
              <span style={{ fontSize: scale === 'large' ? 28 : 18, color: '#F2B705' }}>✓</span>
            </div>
            <div>
              <div style={{
                fontSize: scale === 'large' ? 18 : 13,
                fontWeight: 700, color: '#F2B705', lineHeight: 1.2,
              }}>Recovered</div>
              <div style={{
                fontSize: scale === 'large' ? 13 : 11,
                color: 'rgba(242,183,5,0.6)', marginTop: 4,
              }}>Retried automatically · 26% probability</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
