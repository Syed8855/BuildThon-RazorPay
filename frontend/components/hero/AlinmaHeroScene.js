'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/* ─────────────────────────────────────────────────────────────
   Texture Cache for High-Res Physical Bank Cards
   ───────────────────────────────────────────────────────────── */
const textureCache = {}

function getCardTextures(tierName, bgHex1, bgHex2, accentColor, chipGold = true, cardNumber = '•••• •••• •••• 4287') {
  if (typeof document === 'undefined') return { front: null, back: null }
  const key = `${tierName}-${bgHex1}-${bgHex2}-${accentColor}-${chipGold}-${cardNumber}`
  if (textureCache[key]) return textureCache[key]

  const W = 1024, H = 646 // Authentic 85.60mm x 53.98mm ratio (1.586 : 1)

  /* ── FRONT TEXTURE ────────────────────────────────────────── */
  const canvasFront = document.createElement('canvas')
  canvasFront.width = W; canvasFront.height = H
  const ctxF = canvasFront.getContext('2d')

  // Obsidian / Navy metallic gradient
  const bgGrad = ctxF.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, bgHex1)
  bgGrad.addColorStop(0.5, '#05070D')
  bgGrad.addColorStop(1, bgHex2)
  ctxF.fillStyle = bgGrad
  ctxF.beginPath()
  ctxF.roundRect(0, 0, W, H, 36)
  ctxF.fill()

  // Fine geometric mesh pattern
  ctxF.strokeStyle = 'rgba(255, 255, 255, 0.038)'
  ctxF.lineWidth = 1.2
  for (let x = -H; x <= W + H; x += 38) {
    ctxF.beginPath()
    ctxF.moveTo(x, 0); ctxF.lineTo(x + H, H); ctxF.stroke()
  }

  // Accent radial specular flare
  const flare = ctxF.createRadialGradient(W * 0.82, H * 0.16, 10, W * 0.82, H * 0.16, 360)
  flare.addColorStop(0, accentColor)
  flare.addColorStop(1, 'rgba(0,0,0,0)')
  ctxF.fillStyle = flare
  ctxF.fillRect(0, 0, W, H)

  // Razorpay Wordmark
  ctxF.font = '700 36px Inter, system-ui, sans-serif'
  ctxF.fillStyle = '#FFFFFF'
  ctxF.fillText('razorpay', 54, 78)
  ctxF.fillStyle = '#5284FF'
  ctxF.fillRect(54, 86, 114, 2.5)

  // Card Tier Name Top-Right
  ctxF.font = '600 14px Inter, system-ui, sans-serif'
  ctxF.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctxF.fillText(tierName.toUpperCase(), W - 260, 78)

  // Metallic EMV Chip (3D embedded look with circuit traces)
  const cx = 54, cy = 126, cw = 96, ch = 72
  const chipGrad = ctxF.createLinearGradient(cx, cy, cx + cw, cy + ch)
  if (chipGold) {
    chipGrad.addColorStop(0, '#E5C158')
    chipGrad.addColorStop(0.35, '#FFF4B8')
    chipGrad.addColorStop(0.65, '#D4A827')
    chipGrad.addColorStop(1, '#997715')
  } else {
    chipGrad.addColorStop(0, '#B0B8C8')
    chipGrad.addColorStop(0.5, '#E2E8F0')
    chipGrad.addColorStop(1, '#7A8498')
  }
  ctxF.fillStyle = chipGrad
  ctxF.beginPath()
  ctxF.roundRect(cx, cy, cw, ch, 8)
  ctxF.fill()

  // Chip circuits
  ctxF.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctxF.lineWidth = 1.6
  for (let i = 1; i <= 4; i++) {
    ctxF.beginPath()
    ctxF.moveTo(cx + 4, cy + (ch / 5) * i)
    ctxF.lineTo(cx + cw - 4, cy + (ch / 5) * i)
    ctxF.stroke()
  }
  ctxF.strokeRect(cx + cw / 2 - 13, cy + ch / 2 - 11, 26, 22)

  // Contactless RFID Wave Symbol
  const ax = cx + cw + 36, ay = cy + ch / 2
  for (let i = 1; i <= 4; i++) {
    ctxF.beginPath()
    ctxF.arc(ax, ay, i * 11, -Math.PI * 0.55, Math.PI * 0.55)
    ctxF.strokeStyle = `rgba(255, 255, 255, ${0.15 + i * 0.15})`
    ctxF.lineWidth = 2.4
    ctxF.stroke()
  }

  // Embossed Card Number
  ctxF.font = '600 38px "Courier New", monospace'
  ctxF.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctxF.fillText(cardNumber, 54, H - 135)

  // Cardholder and Expiry
  ctxF.font = '500 13px Inter, sans-serif'
  ctxF.fillStyle = 'rgba(255, 255, 255, 0.42)'
  ctxF.fillText('CARDHOLDER NAME', 54, H - 85)
  ctxF.fillText('EXPIRES', 310, H - 85)

  ctxF.font = '600 18px Inter, sans-serif'
  ctxF.fillStyle = '#FFFFFF'
  ctxF.fillText('REVENUE RECOVERY', 54, H - 56)
  ctxF.fillText('08/29', 310, H - 56)

  // Holographic Dual Security Circles
  ctxF.fillStyle = 'rgba(82, 132, 255, 0.85)'
  ctxF.beginPath(); ctxF.arc(W - 96, H - 72, 30, 0, Math.PI * 2); ctxF.fill()
  ctxF.fillStyle = 'rgba(49, 92, 255, 0.75)'
  ctxF.beginPath(); ctxF.arc(W - 64, H - 72, 30, 0, Math.PI * 2); ctxF.fill()

  const texFront = new THREE.CanvasTexture(canvasFront)
  texFront.anisotropy = 4

  /* ── BACK TEXTURE ─────────────────────────────────────────── */
  const canvasBack = document.createElement('canvas')
  canvasBack.width = W; canvasBack.height = H
  const ctxB = canvasBack.getContext('2d')

  ctxB.fillStyle = '#060810'
  ctxB.beginPath(); ctxB.roundRect(0, 0, W, H, 36); ctxB.fill()

  // Magnetic stripe
  ctxB.fillStyle = '#101420'
  ctxB.fillRect(0, 72, W, 106)

  // Signature strip
  ctxB.fillStyle = '#E5E8F0'
  ctxB.beginPath(); ctxB.roundRect(54, 226, W - 240, 70, 6); ctxB.fill()
  ctxB.font = 'italic 500 16px Georgia, serif'
  ctxB.fillStyle = '#64748B'
  ctxB.fillText('Authorized Signature • Razorpay Revenue Recovery Engine', 70, 268)

  // CVV Box
  ctxB.fillStyle = '#FFFFFF'
  ctxB.beginPath(); ctxB.roundRect(W - 164, 226, 110, 70, 6); ctxB.fill()
  ctxB.font = '700 28px "Courier New", monospace'
  ctxB.fillStyle = '#0F172A'
  ctxB.fillText('4287', W - 136, 268)

  // Back branding
  ctxB.font = '500 14px Inter, sans-serif'
  ctxB.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctxB.fillText('Issued for Razorpay Autonomous Revenue Optimization.', 54, H - 60)
  ctxB.fillText('razorpay.com', W - 160, H - 60)

  const texBack = new THREE.CanvasTexture(canvasBack)
  texBack.anisotropy = 4

  const result = { front: texFront, back: texBack }
  textureCache[key] = result
  return result
}

/* ─────────────────────────────────────────────────────────────
   5 Card Configurations (Alinma Spatial Composition Reference)
   ───────────────────────────────────────────────────────────── */
const CARDS = [
  {
    id: 'enterprise',
    name: 'Razorpay Enterprise',
    bg1: '#0E101A', bg2: '#06080F',
    accent: 'rgba(242, 183, 5, 0.28)',
    chipGold: true,
    cardNumber: '•••• •••• •••• 9921',
    basePos: [-2.3, 0.38, -1.2],
    baseRot: [0.14, 0.38, -0.14],
    scrollPos: [-3.3, 0.65, -1.9],
    scrollRot: [0.2, 0.58, -0.24],
  },
  {
    id: 'corporate',
    name: 'Razorpay Corporate',
    bg1: '#091228', bg2: '#050A18',
    accent: 'rgba(82, 132, 255, 0.38)',
    chipGold: true,
    cardNumber: '•••• •••• •••• 5510',
    basePos: [-1.15, 0.2, -0.55],
    baseRot: [0.09, 0.22, -0.07],
    scrollPos: [-1.75, 0.32, -0.95],
    scrollRot: [0.13, 0.34, -0.11],
  },
  {
    id: 'revenue', // PRIMARY CENTERPIECE CARD
    name: 'Razorpay Revenue',
    bg1: '#0B1636', bg2: '#060E28',
    accent: 'rgba(49, 92, 255, 0.78)',
    chipGold: true,
    cardNumber: '•••• •••• •••• 4287',
    basePos: [0.0, 0.05, 0.3],
    baseRot: [-0.04, 0.04, 0.0],
    scrollPos: [0.0, -0.1, 0.85],
    scrollRot: [-0.08, 0.16, -0.04],
    isPrimary: true,
  },
  {
    id: 'business',
    name: 'Razorpay Business',
    bg1: '#111624', bg2: '#080C14',
    accent: 'rgba(124, 143, 255, 0.32)',
    chipGold: false,
    cardNumber: '•••• •••• •••• 1184',
    basePos: [1.15, -0.16, -0.55],
    baseRot: [-0.09, -0.22, 0.07],
    scrollPos: [1.75, -0.26, -0.95],
    scrollRot: [-0.13, -0.34, 0.11],
  },
  {
    id: 'growth',
    name: 'Razorpay Growth',
    bg1: '#160E26', bg2: '#090514',
    accent: 'rgba(155, 100, 255, 0.28)',
    chipGold: false,
    cardNumber: '•••• •••• •••• 7732',
    basePos: [2.3, -0.32, -1.2],
    baseRot: [-0.14, -0.38, 0.14],
    scrollPos: [3.3, -0.55, -1.9],
    scrollRot: [-0.2, -0.58, 0.24],
  },
]

/* ─────────────────────────────────────────────────────────────
   Individual Physical 3D Bank Card
   ───────────────────────────────────────────────────────────── */
function ArchedCard({ config, index, mouseX, mouseY, scrollProgress, prefersReduced, simStage }) {
  const meshRef = useRef()
  // Card dimensions: 1.586 : 1 ratio (85.60mm x 53.98mm)
  const CW = 3.38, CH = 2.13, CD = 0.054

  const { front: frontTex, back: backTex } = useMemo(
    () => getCardTextures(config.name, config.bg1, config.bg2, config.accent, config.chipGold, config.cardNumber),
    [config]
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    const sp = scrollProgress.current || 0

    // Smooth continuous floating motion
    const flowY = prefersReduced ? 0 : Math.sin(t * 0.95 + index * 0.7) * 0.075
    const flowRot = prefersReduced ? 0 : Math.cos(t * 0.75 + index * 0.6) * 0.038

    // Mouse parallax
    const px = prefersReduced ? 0 : (mouseX.current || 0) * 0.06
    const py = prefersReduced ? 0 : (mouseY.current || 0) * -0.045

    // Primary Card Physical Reactions during Simulation
    let simOffsetX = 0, simOffsetY = 0, simOffsetZ = 0
    let simRotX = 0, simRotY = 0, simRotZ = 0

    if (config.isPrimary && simStage) {
      if (simStage === 'INITIATING') {
        simOffsetY = Math.sin(t * 12) * 0.02
        simRotX = 0.08
      } else if (simStage === 'FAILED') {
        simOffsetX = Math.sin(t * 24) * 0.045
        simRotZ = Math.sin(t * 20) * 0.05
        simRotX = -0.1
      } else if (simStage === 'ANALYZING') {
        simOffsetY = Math.sin(t * 4) * 0.06 + 0.12
        simRotY = Math.sin(t * 2.6) * 0.45
        simOffsetZ = 0.25
      } else if (simStage === 'RETRYING') {
        simRotY = t * 4.2
        simOffsetZ = 0.38
      } else if (simStage === 'RECOVERED') {
        simOffsetY = Math.sin(t * 2) * 0.05 + 0.18
        simRotY = Math.PI * 2
        simOffsetZ = 0.45
      }
    }

    // Interpolate positions between Scroll 1 and Scroll 2
    const targetX = THREE.MathUtils.lerp(config.basePos[0], config.scrollPos[0], sp) + px + simOffsetX
    const targetY = THREE.MathUtils.lerp(config.basePos[1], config.scrollPos[1], sp) + flowY + py + simOffsetY
    const targetZ = THREE.MathUtils.lerp(config.basePos[2], config.scrollPos[2], sp) + simOffsetZ

    const targetRotX = THREE.MathUtils.lerp(config.baseRot[0], config.scrollRot[0], sp) + py * 0.5 + simRotX
    const targetRotY = THREE.MathUtils.lerp(config.baseRot[1], config.scrollRot[1], sp) + flowRot + px * 0.8 + simRotY
    const targetRotZ = THREE.MathUtils.lerp(config.baseRot[2], config.scrollRot[2], sp) + simRotZ

    meshRef.current.position.set(targetX, targetY, targetZ)
    meshRef.current.rotation.set(targetRotX, targetRotY, targetRotZ)
  })

  return (
    <group ref={meshRef} position={config.basePos} rotation={config.baseRot}>
      {/* ── 3D PHYSICAL CARD BODY ───── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CW, CH, CD]} />
        <meshPhysicalMaterial
          color="#080B14"
          roughness={0.24}
          metalness={0.16}
          clearcoat={0.72}
          clearcoatRoughness={0.11}
          reflectivity={0.92}
        />
      </mesh>

      {/* Front Textured Surface */}
      {frontTex && (
        <mesh position={[0, 0, CD / 2 + 0.001]}>
          <planeGeometry args={[CW - 0.004, CH - 0.004]} />
          <meshStandardMaterial
            map={frontTex}
            roughness={0.22}
            metalness={0.15}
          />
        </mesh>
      )}

      {/* Back Textured Surface */}
      {backTex && (
        <mesh position={[0, 0, -(CD / 2 + 0.001)]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CW - 0.004, CH - 0.004]} />
          <meshStandardMaterial
            map={backTex}
            roughness={0.26}
            metalness={0.12}
          />
        </mesh>
      )}

      {/* Primary Card Metallic Rim Glow */}
      {config.isPrimary && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[CW + 0.02, CH + 0.02, CD + 0.008]} />
          <meshBasicMaterial
            color={simStage === 'FAILED' ? '#C97070' : simStage === 'RECOVERED' ? '#F2B705' : '#4F6FFF'}
            transparent
            opacity={simStage === 'RECOVERED' ? 0.65 : 0.38}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}

/* ── Fallback 2D Card ────────────────────────────────────────── */
function FallbackCard() {
  return (
    <div
      style={{
        width: 320,
        height: 202,
        borderRadius: 18,
        background: 'linear-gradient(135deg, #0A1636 0%, #05070D 100%)',
        border: '1px solid rgba(82, 132, 255, 0.35)',
        boxShadow: '0 12px 36px rgba(49, 92, 255, 0.25)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        color: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>razorpay</span>
        <span style={{ fontSize: 11, color: '#5284FF', fontWeight: 600 }}>REVENUE RECOVERY</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.12em', opacity: 0.85 }}>
        ••••  ••••  ••••  4287
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.65 }}>
        <span>CARDHOLDER NAME</span>
        <span>08/29</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Alinma Hero 3D Scene Component (Dribbble 3D Animation Benchmark)
   ───────────────────────────────────────────────────────────── */
export default function AlinmaHeroScene({ prefersReduced = false, simStage = null }) {
  const mouseX = useRef(0)
  const mouseY = useRef(0)
  const scrollProgress = useRef(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const handleMouseMove = (e) => {
      mouseX.current = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY.current = (e.clientY / window.innerHeight - 0.5) * 2
    }

    const handleScroll = () => {
      const h = window.innerHeight || 800
      const currentScroll = window.scrollY || 0
      const p = Math.min(Math.max(currentScroll / h, 0), 1)
      scrollProgress.current = p
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <FallbackCard />
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        pointerEvents: 'none', // Crucial: WebGL layer does not intercept user clicks or navigation
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        dpr={[1, 2]}
        style={{ pointerEvents: 'none' }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.6]} fov={40} />

        {/* Studio Three-Point Lighting */}
        <ambientLight intensity={0.38} />
        <directionalLight position={[4, 6, 5]} intensity={1.4} color="#FFFFFF" />
        <directionalLight position={[-4, 2, 3]} intensity={0.45} color="#80A8FF" />
        <pointLight position={[0, 3, -3]} intensity={5.0} color="#315CFF" distance={15} />
        <pointLight position={[2, -4, 2]} intensity={0.7} color="#F2B705" distance={10} />

        {/* 5 Layered Arched Bank Cards (Alinma Composition) */}
        {CARDS.map((card, idx) => (
          <ArchedCard
            key={card.id}
            config={card}
            index={idx}
            mouseX={mouseX}
            mouseY={mouseY}
            scrollProgress={scrollProgress}
            prefersReduced={prefersReduced}
            simStage={simStage}
          />
        ))}

        {/* Soft Contact Floor Shadow */}
        <ContactShadows
          position={[0, -2.1, 0]}
          opacity={0.65}
          scale={12}
          blur={2.8}
          far={4.5}
          color="#00040D"
        />
      </Canvas>
    </div>
  )
}
