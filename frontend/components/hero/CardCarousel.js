'use client'

import React, { useRef, useEffect, useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   Premium 3D Horizontal Cylinder Bank Card Carousel
   Adapted to Razorpay Revenue Recovery design system.
   - Pure requestAnimationFrame (60fps), no animation libs
   - Continuous circular scroll with dwell at front center
   - Inertia-damped mouse parallax tilt
   - Real volumetric 3D thickness via dense layer stacking
   - Front face: autoplaying video, metallic chip, embedded logo,
     intersecting security circles
   - Back face: blurred video, magnetic stripe, mono cardholder info
   ───────────────────────────────────────────────────────────── */

const CARD_VIDEOS = [
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_030111_a9e15665-d379-4a7f-8116-695bbe452ad1.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_171347_f640c30d-ec21-426a-98bc-77e07c2c60cb.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_161253_c72b1869-400f-45ed-ac0c-52f68c2ed5bd.mp4',
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_115655_b4d9cd77-feed-43cd-a198-af78ebdf1f7a.mp4',
]

// Beautiful premium solid gradient colors for realistic cards (Razorpay-tinted)
const CARD_COLORS = [
  'linear-gradient(135deg, #0E101A 0%, #1B2340 100%)', // Obsidian Blue
  'linear-gradient(135deg, #160E26 0%, #2A1B4E 100%)', // Royal Violet
  'linear-gradient(135deg, #101C2E 0%, #1E3A5F 100%)', // Deep Azure
  'linear-gradient(135deg, #1A1020 0%, #3A1B3A 100%)', // Burgundy Plum
  'linear-gradient(135deg, #0C1618 0%, #142E33 100%)', // Green Slate
]

const CARD_DETAILS = [
  { number: '4287 1162 9042 5521', name: 'ZACHARY MERCER', cvv: '382', brand: 'razorpay' },
  { number: '5451 7831 3904 7124', name: 'SOPHIA MARTINEZ', cvv: '109', brand: 'razorpay' },
  { number: '4558 4120 7733 9035', name: 'BENJAMIN CARTER', cvv: '764', brand: 'razorpay' },
  { number: '4246 5567 1223 2468', name: 'EMILY MORRISON', cvv: '491', brand: 'razorpay' },
  { number: '5296 8891 8234 7713', name: 'JACKSON REID', cvv: '255', brand: 'razorpay' },
]

// Volumetric 3D thickness layers
const THICKNESS_LAYERS = [-1.47, -0.73, 0, 0.73, 1.47]

/* ── Embedded JWT / Brand Wordmark SVG ─────────────────────── */
function BrandMark({ brand }) {
  return (
    <svg viewBox="0 0 341 49" fill="none" className="w-[84px] xs:w-[101px] sm:w-[120px] h-auto" xmlns="http://www.w3.org/2000/svg">
      <g fill="white">
        <path d="M28 44.5c-3 0-5.2-.8-6.6-2.4-1.3-1.6-2-3.7-2.3-6.4-.3-2.6-.3-5.1 0-7.8.4-2.1 1.1-4.3 2.1-6.4.8-2.1 1.8-4.2 3-6.3 1.2-2.1 2.2-3.9 3.2-5.2.9-1.2 1.8-1.9 2.8-2 1-.2 1.9 0 2.6.4.8.4 1.4 1.1 1.7 2 .4 1-.3 2-1.2 3.4-1.7 2.5-2.9 5-3.7 7.6-.8 2.5-1.4 4.9-1.7 6.9-.3 1.9-.3 3.5-.1 4.6.3 1 1 1.6 1.9 1.6.8 0 1.7-.3 2.6-1 1-.6 1.9-1.7 2.9-3.4.9-1.7 1.8-4 2.7-6.8.9-2.8 1.8-6.6 2.9-11 .2-.7.7-1.3 1.3-1.6.7-.3 1.5-.4 2.2-.2.8.2 1.4.6 1.9 1.3.5.6.6 1.4.4 2.3a49 49 0 01-1.7 8.8c-.9 3.9-1.4 7.3-1.4 9.8 0 1.7.4 3 .9 3.8.5.7 1 1.1 1.7 1.1.7 0 1.5-.3 2.2-.8.9-.6 1.8-1.7 2.7-3.2.8-1.4 1.6-3.4 2.3-5.7-2.4-2-4.4-4.8-6-8.1-1.5-3.4-2.4-7.2-2.4-11.6 0-1.8.2-3.6.6-5.2.4-1.5 1.2-2.8 2.2-3.8.9-.9 2.3-1.4 4.1-1.4 2.1 0 3.9.8 5.2 2.4 1.4 1.5 2.4 3.5 3 6.1.7 2.6 1 5.5.8 8.7-.1 3.2-.5 6.5-1.1 9.9.6.3 1.3.5 2 .7a15 15 0 004.3.6c1.8 0 3.6-.3 5.4-.9 1.8-.5 3.4-1.2 4.7-2.1.8-.5 1.6-.7 2.3-.4.7.2 1.3.6 1.7 1.3.5.6.6 1.4.5 2.2-.1.6-.5 1.2-1.3 1.8-1.9 1.2-4 2.3-6.4 3-2.4.7-4.7 1.1-7.1 1.1a21 21 0 01-5.8-1.1c-1.2 4-2.9 7.3-5.1 9.7-2.1 2.4-4.8 3.7-8 3.7-2.1 0-3.9-.6-5.7-1.8-1.7-1.3-3-2.9-3.8-4.8l-.5-1.9a19 19 0 01-1.1 2.3c-1.5 2.2-3.3 4-5.3 5.4-1.9 1.4-4 2.1-6.4 2.1zM41.6 23.1V23c0-3.2-.2-6-.7-7.9-.4-1.8-1-3.2-1.8-3.9.8.2 1.4 1 1.8 2.7.4 1.7.5 3.6.7 5.9V23c0 2.1.7 3.9 1.9 5.4a8 8 0 01-1.8 4.3l-1.5 1.3c-.4 1.6-1 2.5-1.8 2.5h-.2c-.2 0-.4-.2-.6-.6.4-.6.5-1.4.4-2.5.4-.5 1-.7 1.6-1.2.8-.8 1.4-2 1.8-3.7l-.9 0h-.1l.5-1.7 1.2.5 1.9-3.6zM176.8 17.8a15 15 0 0111.6 5.3l-9.5 7.2-1.5-1.9-10-5.6 2.2-1.8 7.3 1.6-5.6-3.9 5.5-1 5-1.4 4.5-1.5-.6 2.6zM218.6 30.6c0 3-1.3 5.7-3.9 8.1 0 0-2.8-4.6-3.1-8.1 0-1.5 0-3 0-4.5 2.7-.7 5.2-1.7 7-3V30.6c-.2 1.2-3.4 1.7-3.4 1.7l3.4 1.6 3.4-0.6-2.6 2.5-1.9 3.4-3.3-4.4 1.2-1.2 1.3 2.8 1.8-2.7-2.6-1.4-4.5 2.4 3.9 3.5zM283.7 13.2c4.3 0 7.7 1.3 10.2 3.8 2.6 2.5 3.9 6.1 3.9 11V47h-6.1V28.7c0-3.3-.8-5.8-2.4-7.4-1.6-1.7-3.8-2.5-6.8-2.5-3.3 0-5.9 1-7.9 2.9-1.9 1.9-2.8 4.7-2.8 8.3V47h-6.2V13.6h5.9v5.1c1.3-1.8 2.9-3.1 5-4.1 2.1-.9 4.6-1.4 7.2-1.4zM319.8 31.7l-7 6.5V47h-6.2V0h6.2v30.5l18.5-16.9h7.4l-14.3 14 15.7 19.9h-7.6L319.8 31.7z" />
      </g>
    </svg>
  )
}

/* ── Metallic Contact Chip SVG ─────────────────────────────── */
function MetallicChip({ index }) {
  return (
    <svg className="w-6 h-6 sm:w-[29px] sm:h-[29px]" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 8H40V14C40.0016 14.5299 40.2128 15.0377 40.5875 15.4125C40.9623 15.7872 41.4701 15.9984 42 16H59V24H42C41.4701 24.0016 40.9623 24.2128 40.5875 24.5875C40.2128 24.9623 40.0016 25.4701 40 26V52H20V8ZM18 8H8.00039C4.47435 8 1.56576 10.6083 1.08 14H18V8ZM1 16V24V26V34V36V44H18V36H1V34H18V26H1V24H18V16H1ZM1.08 46C1.56576 49.3917 4.47435 52 8.00039 52H18V46H1.08ZM42 14V8H52.0004C55.5264 8 58.4342 10.6084 58.92 14H42ZM59 26H42V34H59V26ZM59 36H42V44H59V36ZM52.0004 52H42V46H58.92C58.4342 49.3916 55.5264 52 52.0004 52Z"
        fill={`url(#chipGrad_${index})`}
      />
      <path d="M1.02453 14.4146C1.00608 14.609 0.998061 14.8045 1.00039 15C1.00039 14.8028 1.00854 14.6076 1.02453 14.4146ZM1.00039 45C0.998061 45.1955 1.00608 45.391 1.02453 45.5854C1.00854 45.3924 1.00039 45.1972 1.00039 45ZM59.0004 15C59.0026 14.8176 58.9955 14.6353 58.9794 14.4538C58.9933 14.634 59.0004 14.8162 59.0004 15ZM59.0004 45C59.0004 45.1838 58.9933 45.366 58.9794 45.5462C58.9955 45.3647 59.0026 45.1824 59.0004 45Z" fill="#B7B7B7" />
      <defs>
        <linearGradient id={`chipGrad_${index}`} x1="30" y1="8" x2="30" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF6CC" />
          <stop offset="0.45" stopColor="#E5C158" />
          <stop offset="1" stopColor="#997715" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function CardCarousel() {
  const cardCount = 5
  const cardsRefs = useRef([])
  const frameId = useRef(0)
  const progress = useRef(0)
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  const [metrics, setMetrics] = useState({ cardW: 336, cardH: 211 })

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
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      let cardW = Math.round(w * 0.16 + 130)
      const heightFactor = Math.min(1.0, Math.max(0.65, h / 850))
      cardW = Math.round(cardW * heightFactor)
      cardW = Math.min(336, Math.max(150, cardW))
      const cardH = Math.round(cardW / 1.5925)
      setMetrics({ cardW, cardH })
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const renderLoop = () => {
    progress.current += 0.0016
    mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.08
    mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.08

    const cards = cardsRefs.current
    const h = window.innerHeight
    const { cardH } = metrics

    const continuousProgress = progress.current
    const roundedIndex = Math.round(continuousProgress)
    const diffFromRound = continuousProgress - roundedIndex

    const easedDiff = Math.sign(diffFromRound) * Math.pow(Math.abs(diffFromRound) * 2, 4.2) / 2
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

      if (absOffset > 3.0) {
        card.style.visibility = 'hidden'
        continue
      } else {
        card.style.visibility = 'visible'
      }

      const gap = 36
      const peekAmount = -55
      const D = 1350

      let y = 0
      let z = 0
      let rot = 0

      if (absOffset <= 1) {
        const t = absOffset
        const easedT = t * t * (3 - 2 * t)
        const targetY = cardH + gap
        y = -sign * (easedT * targetY)
        z = 400 + easedT * (220 - 400)
        rot = easedT * 132
      } else if (absOffset <= 2) {
        const t = absOffset - 1
        const easedT = t * t * (3 - 2 * t)
        const yStart = cardH + gap
        const zStart = 220
        const rotStart = 132
        const zEnd = -60
        const rotEnd = 175
        const sEnd = D / (D - zEnd)
        const yEnd = (h / 2 - peekAmount) / sEnd - (cardH / 2)
        const currentY = yStart + easedT * (yEnd - yStart)
        y = -sign * currentY
        z = zStart + easedT * (zEnd - zStart)
        rot = rotStart + easedT * (rotEnd - rotStart)
      } else {
        const t = Math.min(absOffset - 2, 1)
        const easedT = t * t * (3 - 2 * t)
        const zStart = -60
        const rotStart = 175
        const zEnd3 = -250
        const rotEnd3 = 195
        const sEnd2 = D / (D - zStart)
        const yEnd2 = (h / 2 - peekAmount) / sEnd2 - (cardH / 2)
        const sEnd3 = D / (D - zEnd3)
        const yEnd3 = (h / 2 + 100) / sEnd3 + (cardH / 2)
        const currentY = yEnd2 + easedT * (yEnd3 - yEnd2)
        y = -sign * currentY
        z = zStart + easedT * (zEnd3 - zStart)
        rot = rotStart + easedT * (rotEnd3 - rotStart)
      }

      const localCardRotation = -sign * rot
      const centerFactor = Math.max(0, 1 - absOffset)
      const maxTiltY = 15
      const maxTiltX = 12
      const activeTiltX = -mouse.current.y * maxTiltX * centerFactor
      const activeTiltY = mouse.current.x * maxTiltY * centerFactor
      const totalRotX = localCardRotation + activeTiltX
      const totalRotY = activeTiltY

      card.style.zIndex = Math.round(z).toString()
      card.style.opacity = '1'
      card.style.transform = `translateY(${y.toFixed(2)}px) translateZ(${z.toFixed(2)}px) rotateX(${totalRotX.toFixed(2)}deg) rotateY(${totalRotY.toFixed(2)}deg) rotateZ(-3deg)`
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
    <div className="flex items-center justify-center overflow-hidden select-none" style={{ width: '100%', height: '100%', background: 'transparent' }}>
      <div
        className="relative w-full h-full flex items-center justify-center pointer-events-none"
        style={{ perspective: '1350px' }}
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
                ref={(el) => { cardsRefs.current[i] = el; }}
                className="absolute inset-0"
                style={{
                  width: `${metrics.cardW}px`,
                  height: `${metrics.cardH}px`,
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'visible',
                }}
              >
                {THICKNESS_LAYERS.map((zOffset, layerIdx) => {
                  const isFrontFace = layerIdx === THICKNESS_LAYERS.length - 1
                  const isBackFace = layerIdx === 0

                  if (!isFrontFace && !isBackFace) {
                    return (
                      <div
                        key={layerIdx}
                        className="absolute inset-0 rounded-[16px] pointer-events-none overflow-hidden"
                        style={{
                          background: 'linear-gradient(180deg, #8A93A8 0%, #4A5166 100%)',
                          border: '1px solid #6A7286',
                          transform: `translateZ(${zOffset}px)`,
                        }}
                      />
                    )
                  }

                  if (isFrontFace) {
                    return (
                      <div
                        key={layerIdx}
                        className="absolute inset-0 rounded-[16px] border border-white/15 pointer-events-none overflow-hidden"
                        style={{
                          background: gradient,
                          transform: `translateZ(${zOffset}px)`,
                          backfaceVisibility: 'hidden',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18), 0 12px 40px rgba(0,0,0,0.6)',
                        }}
                      >
                        <video src={videoSrc} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover rounded-[16px]" style={{ opacity: 1 }} />

                        <div
                          className="absolute inset-0 text-white h-full w-full z-10"
                          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.35) 100%)' }}
                        >
                          {/* Metallic Contact Chip */}
                          <div className="absolute" style={{ left: 20, top: '50%', transform: 'translateY(-50%)' }}>
                            <MetallicChip index={i} />
                          </div>

                          {/* Razorpay Brand Logo top-right */}
                          <div className="absolute" style={{ right: 20, top: 18, opacity: 0.95 }}>
                            <BrandMark brand={details.brand} />
                          </div>

                          {/* Intersecting Circle Security Marks bottom-right */}
                          <div className="absolute flex flex-row items-center" style={{ right: 20, bottom: 16 }}>
                            <div className="rounded-full bg-white/25 backdrop-blur-[1px] border border-white/15" style={{ width: 22, height: 22, marginRight: -8 }} />
                            <div className="rounded-full bg-white/35 backdrop-blur-[1px] border border-white/15" style={{ width: 22, height: 22 }} />
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (isBackFace) {
                    return (
                      <div
                        key={layerIdx}
                        className="absolute inset-0 rounded-[16px] border border-white/15 pointer-events-none overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, #0E101A 0%, #101626 100%)',
                          transform: `translateZ(${zOffset}px) rotateX(180deg)`,
                          backfaceVisibility: 'hidden',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15)',
                        }}
                      >
                        {/* Blurred video background */}
                        <div className="absolute inset-0 pointer-events-none" style={{ filter: 'blur(16px)', transform: 'scale(1.15)' }}>
                          <video src={videoSrc} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-40" />
                        </div>

                        {/* Magnetic Stripe */}
                        <div className="absolute left-0 right-0 z-10 bg-black/85 backdrop-blur-md" style={{ top: 14, height: 32 }} />

                        {/* Cardholder details with JetBrains Mono */}
                        <div
                          className="absolute z-20 flex flex-col text-left"
                          style={{ left: 20, bottom: 16, fontFamily: '"JetBrains Mono", "Courier New", monospace' }}
                        >
                          <div className="font-mono font-medium tracking-[0.14em] text-white select-none" style={{ fontSize: 11 }}>
                            {details.number}
                          </div>
                          <div className="font-mono font-medium text-white/70 tracking-wide flex items-center gap-2 select-none" style={{ fontSize: 8 }}>
                            <span className="uppercase">{details.name}</span>
                            <span className="text-white/40 font-light">•</span>
                            <span>CVV: {details.cvv}</span>
                          </div>
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
