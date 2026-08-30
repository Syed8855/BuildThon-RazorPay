'use client'

import React, { useRef, useEffect, useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   Premium 3D Horizontal Cylinder Bank Card Carousel
   Adapted to Razorpay Revenue Recovery design system.
   - Screen-dimension-adaptive sizing (fits mobile, tablet, laptop, 4K)
   - Natural 3D cylinder curvature (max 28° tilt so entire card face is always visible)
   - Pure requestAnimationFrame (60fps) with inertia-damped mouse parallax
   - Complete front & back card faces (video, metallic EMV chip, RFID, embossed numbers, branding)
   - No sub-pixel glitching or 3D layer clipping
   ───────────────────────────────────────────────────────────── */

const CARD_VIDEOS = [
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_030111_a9e15665-d379-4a7f-8116-695bbe452ad1.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_171347_f640c30d-ec21-426a-98bc-77e07c2c60cb.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_115655_b4d9cd77-feed-43cd-a198-af78ebdf1f7a.mp4',
]

const CARD_COLORS = [
  'linear-gradient(135deg, #0A0E1A 0%, #151D33 100%)', // Obsidian Blue
  'linear-gradient(135deg, #120B20 0%, #22153D 100%)', // Royal Violet
  'linear-gradient(135deg, #0C1524 0%, #182C48 100%)', // Deep Azure
  'linear-gradient(135deg, #160B18 0%, #2D142E 100%)', // Burgundy Plum
  'linear-gradient(135deg, #081214 0%, #102428 100%)', // Slate Emerald
]

const CARD_DETAILS = [
  { number: '••••  ••••  ••••  4287', name: 'ZACHARY MERCER', exp: '08/29', cvv: '382', brand: 'razorpay' },
  { number: '••••  ••••  ••••  7124', name: 'SOPHIA MARTINEZ', exp: '11/30', cvv: '109', brand: 'razorpay' },
  { number: '••••  ••••  ••••  9035', name: 'BENJAMIN CARTER', exp: '04/28', cvv: '764', brand: 'razorpay' },
  { number: '••••  ••••  ••••  2468', name: 'EMILY MORRISON', exp: '09/31', cvv: '491', brand: 'razorpay' },
  { number: '••••  ••••  ••••  7713', name: 'JACKSON REID', exp: '01/30', cvv: '255', brand: 'razorpay' },
]

// Volumetric 3D thickness layers (sub-pixel offsets)
const THICKNESS_LAYERS = [-1.2, -0.6, 0, 0.6, 1.2]

/* ── Razorpay Brand Wordmark SVG ────────────────────────────── */
function BrandMark() {
  return (
    <div className="flex items-center gap-1.5 select-none">
      <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
        razorpay
      </span>
      <span style={{ width: 18, height: 2, background: '#5284FF', borderRadius: 1 }} />
    </div>
  )
}

/* ── Contactless RFID Wave Symbol ───────────────────────────── */
function ContactlessSymbol() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.75 }}>
      <path d="M7 16.5C7.8 15.5 8.3 14.3 8.3 13C8.3 11.7 7.8 10.5 7 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.5 19C12 17.5 12.8 15.3 12.8 13C12.8 10.7 12 8.5 10.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 21.5C16.2 19.3 17.3 16.3 17.3 13C17.3 9.7 16.2 6.7 14 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/* ── Metallic Contact Chip SVG ─────────────────────────────── */
function MetallicChip({ index }) {
  return (
    <div
      style={{
        width: 38,
        height: 28,
        borderRadius: 5,
        background: 'linear-gradient(135deg, #FDE68A 0%, #D97706 50%, #78350F 100%)',
        border: '1px solid rgba(253, 230, 138, 0.6)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.4)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Circuit lines */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '33%', width: 1, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: '33%', width: 1, background: 'rgba(0,0,0,0.35)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: '48%', height: 1, background: 'rgba(0,0,0,0.35)' }} />
      <div
        style={{
          position: 'absolute',
          top: '28%',
          bottom: '28%',
          left: '30%',
          right: '30%',
          border: '1px solid rgba(0,0,0,0.35)',
          borderRadius: 2,
        }}
      />
    </div>
  )
}

export default function CardCarousel() {
  const cardCount = 5
  const cardsRefs = useRef([])
  const frameId = useRef(0)
  const progress = useRef(0)
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  const [metrics, setMetrics] = useState({ cardW: 260, cardH: 164, viewportH: 800 })

  useEffect(() => {
    const handleMouseMove = (e) => {
      const rx = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2)
      const ry = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2)
      mouse.current.targetX = Math.max(-1, Math.min(1, rx))
      mouse.current.targetY = Math.max(-1, Math.min(1, ry))
    }
    const handleMouseLeave = () => {
      mouse.current.targetX = 0
      mouse.current.targetY = 0
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth || 1200
      const h = window.innerHeight || 800

      // Adaptive card sizing mapped directly to user screen dimensions
      let cardW = 260
      if (w < 640) {
        cardW = Math.round(Math.min(w * 0.68, 210))
      } else if (w < 1024) {
        cardW = Math.round(Math.min(w * 0.28, 240))
      } else if (w < 1440) {
        cardW = Math.round(Math.min(w * 0.19, 260))
      } else {
        cardW = Math.round(Math.min(w * 0.16, 280))
      }

      // Height constraint: ensure card height does not exceed 23% of viewport height
      const maxAllowedH = Math.round(h * 0.23)
      if (cardW / 1.586 > maxAllowedH) {
        cardW = Math.round(maxAllowedH * 1.586)
      }

      cardW = Math.max(160, Math.min(290, cardW))
      const cardH = Math.round(cardW / 1.586)

      setMetrics({ cardW, cardH, viewportH: h })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const renderLoop = () => {
    progress.current += 0.0014
    mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08
    mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08

    const cards = cardsRefs.current
    const { cardH, viewportH } = metrics

    const continuousProgress = progress.current
    const roundedIndex = Math.round(continuousProgress)
    const diffFromRound = continuousProgress - roundedIndex

    // Smooth ease between cards
    const easedDiff = Math.sign(diffFromRound) * Math.pow(Math.abs(diffFromRound) * 2, 3.6) / 2
    const virtualActiveIndex = roundedIndex + easedDiff

    for (let i = 0; i < cardCount; i++) {
      const card = cards[i]
      if (!card) continue

      let offset = i - virtualActiveIndex
      const halfCount = cardCount / 2
      while (offset > halfCount) offset -= cardCount
      while (offset < -halfCount) offset += cardCount

      const absOffset = Math.abs(offset)
      const sign = Math.sign(offset)

      if (absOffset > 2.5) {
        card.style.visibility = 'hidden'
        continue
      } else {
        card.style.visibility = 'visible'
      }

      // Proportional vertical spacing and gentle rotation (never exceeds 28° so full card face is always visible)
      const spacingY = cardH * 1.05 + 16
      let y = 0
      let z = 0
      let rot = 0
      let opacity = 1

      if (absOffset <= 1) {
        const t = absOffset
        const easedT = t * t * (3 - 2 * t)
        y = -sign * (easedT * spacingY)
        z = 60 - easedT * 90 // Active front at z=60px, transitioning to z=-30px
        rot = easedT * 20   // Gentle 20° tilt
        opacity = 1
      } else if (absOffset <= 2) {
        const t = absOffset - 1
        const easedT = t * t * (3 - 2 * t)
        y = -sign * (spacingY + easedT * (spacingY * 0.95))
        z = -30 - easedT * 110 // z=-30px to z=-140px
        rot = 20 + easedT * 8  // Max 28° tilt (always readable and visible!)
        opacity = 1 - easedT * 0.4
      } else {
        const t = Math.min(absOffset - 2, 1)
        y = -sign * (spacingY * 1.95 + t * 40)
        z = -140 - t * 80
        rot = 28
        opacity = Math.max(0, 0.6 - t * 0.6)
      }

      const localCardRotation = -sign * rot
      const centerFactor = Math.max(0, 1 - absOffset)
      const maxTiltY = 12
      const maxTiltX = 8
      const activeTiltX = -mouse.current.y * maxTiltX * centerFactor
      const activeTiltY = mouse.current.x * maxTiltY * centerFactor
      const totalRotX = localCardRotation + activeTiltX
      const totalRotY = activeTiltY

      card.style.zIndex = Math.round(z + 200).toString()
      card.style.opacity = opacity.toFixed(3)
      card.style.transform = `translateY(${y.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${totalRotX.toFixed(2)}deg) rotateY(${totalRotY.toFixed(2)}deg) rotateZ(-2deg)`
    }
  }

  useEffect(() => {
    const tick = () => {
      renderLoop()
      frameId.current = requestAnimationFrame(tick)
    }
    frameId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId.current)
  }, [metrics])

  return (
    <div
      className="flex items-center justify-center overflow-hidden select-none"
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <div
        className="relative w-full h-full flex items-center justify-center pointer-events-none"
        style={{ perspective: '1200px' }}
      >
        <div
          className="absolute"
          style={{
            width: `${metrics.cardW}px`,
            height: `${metrics.cardH}px`,
            transformStyle: 'preserve-3d',
          }}
        >
          {Array.from({ length: cardCount }).map((_, i) => {
            const details = CARD_DETAILS[i % CARD_DETAILS.length]
            const videoSrc = CARD_VIDEOS[i % CARD_VIDEOS.length]
            const gradient = CARD_COLORS[i % CARD_COLORS.length]

            return (
              <div
                key={i}
                ref={(el) => {
                  cardsRefs.current[i] = el
                }}
                className="absolute inset-0"
                style={{
                  width: `${metrics.cardW}px`,
                  height: `${metrics.cardH}px`,
                  transformStyle: 'preserve-3d',
                }}
              >
                {THICKNESS_LAYERS.map((zOffset, layerIdx) => {
                  const isFrontFace = layerIdx === THICKNESS_LAYERS.length - 1
                  const isBackFace = layerIdx === 0

                  // Intermediate 3D thickness edge layers
                  if (!isFrontFace && !isBackFace) {
                    return (
                      <div
                        key={layerIdx}
                        className="absolute inset-0 rounded-[14px] pointer-events-none"
                        style={{
                          background: 'linear-gradient(180deg, #5A6478 0%, #2A3040 100%)',
                          border: '1px solid rgba(100, 115, 145, 0.4)',
                          transform: `translateZ(${zOffset}px)`,
                        }}
                      />
                    )
                  }

                  // FRONT FACE (Fully composed, rich metallic card with video background)
                  if (isFrontFace) {
                    return (
                      <div
                        key={layerIdx}
                        className="absolute inset-0 rounded-[14px] pointer-events-none overflow-hidden"
                        style={{
                          background: gradient,
                          border: '1px solid rgba(255, 255, 255, 0.22)',
                          transform: `translateZ(${zOffset}px)`,
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.28)',
                        }}
                      >
                        {/* Autoplaying Video Background */}
                        <video
                          src={videoSrc}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          style={{ opacity: 0.82, filter: 'contrast(1.08) brightness(0.95)' }}
                        />

                        {/* Metallic Glass Tint Overlay */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.7) 100%)',
                          }}
                        />

                        {/* Complete Card Foreground Elements */}
                        <div
                          className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between text-white z-10 select-none"
                          style={{ fontFamily: 'var(--font)' }}
                        >
                          {/* Top Row: Brandmark + Contactless Wave */}
                          <div className="flex items-center justify-between">
                            <BrandMark />
                            <div className="flex items-center gap-1 text-white/80">
                              <ContactlessSymbol />
                              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#5284FF' }}>
                                RECOVERY
                              </span>
                            </div>
                          </div>

                          {/* Middle Row: Metallic EMV Contact Chip + Status Indicator */}
                          <div className="flex items-center justify-between my-auto">
                            <MetallicChip index={i} />
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                padding: '2px 7px',
                                borderRadius: 10,
                                background: 'rgba(82, 132, 255, 0.2)',
                                border: '1px solid rgba(82, 132, 255, 0.45)',
                                color: '#99BBFF',
                              }}
                            >
                              AI GUARD
                            </div>
                          </div>

                          {/* Bottom Row: Masked Card Number + Cardholder Details & Hologram */}
                          <div className="flex flex-col gap-1">
                            <div
                              style={{
                                fontFamily: '"JetBrains Mono", "Courier New", monospace',
                                fontSize: 'clamp(11px, 1.2vw, 13.5px)',
                                letterSpacing: '0.12em',
                                color: 'rgba(255, 255, 255, 0.95)',
                                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                fontWeight: 600,
                              }}
                            >
                              {details.number}
                            </div>

                            <div className="flex items-center justify-between text-white/70" style={{ fontSize: 9 }}>
                              <div className="flex items-center gap-3">
                                <div>
                                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>CARDHOLDER</div>
                                  <div style={{ fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.04em' }}>{details.name}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>EXPIRES</div>
                                  <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{details.exp}</div>
                                </div>
                              </div>

                              {/* Intersecting Holographic Security Circles */}
                              <div className="flex items-center" style={{ marginRight: 2 }}>
                                <div
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.35)',
                                    backdropFilter: 'blur(2px)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    marginRight: -6,
                                  }}
                                />
                                <div
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: 'rgba(82, 132, 255, 0.55)',
                                    backdropFilter: 'blur(2px)',
                                    border: '1px solid rgba(82, 132, 255, 0.4)',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // BACK FACE (Sleek magnetic stripe + signature panel)
                  if (isBackFace) {
                    return (
                      <div
                        key={layerIdx}
                        className="absolute inset-0 rounded-[14px] pointer-events-none overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, #090C16 0%, #101628 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.16)',
                          transform: `translateZ(${zOffset}px) rotateX(180deg)`,
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                        }}
                      >
                        {/* Magnetic Stripe */}
                        <div
                          className="absolute left-0 right-0 z-10"
                          style={{
                            top: 14,
                            height: 28,
                            background: '#04060A',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                          }}
                        />

                        {/* Signature & CVV Panel */}
                        <div
                          className="absolute left-3 right-3 z-20 flex items-center justify-between"
                          style={{
                            top: 50,
                            height: 24,
                            background: '#E2E8F0',
                            borderRadius: 3,
                            padding: '0 8px',
                          }}
                        >
                          <span style={{ fontSize: 8, fontStyle: 'italic', color: '#64748B', fontWeight: 500 }}>
                            Authorized Signature
                          </span>
                          <span
                            style={{
                              fontFamily: '"JetBrains Mono", monospace',
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#0F172A',
                            }}
                          >
                            {details.cvv}
                          </span>
                        </div>

                        {/* Footer info */}
                        <div
                          className="absolute bottom-3 left-3 right-3 flex items-center justify-between"
                          style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.45)' }}
                        >
                          <span>Razorpay Autonomous Recovery</span>
                          <span>razorpay.com</span>
                        </div>
                      </div>
                    )
                  }

                  return null
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

