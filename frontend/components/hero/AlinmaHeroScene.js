'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/* ── Generate Cached High-Res Canvas Textures ──────────────── */
const textureCache = {}

function getCardTexture(tierName, bgHex1, bgHex2, accentColor, chipGold = true) {
  if (typeof document === 'undefined') return null
  const key = `${tierName}-${bgHex1}-${bgHex2}-${accentColor}-${chipGold}`
  if (textureCache[key]) return textureCache[key]

  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Dark obsidian/navy gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, bgHex1)
  bgGrad.addColorStop(0.5, '#05070D')
  bgGrad.addColorStop(1, bgHex2)
  ctx.fillStyle = bgGrad
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 36)
  ctx.fill()

  // Fine geometric mesh pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)'
  ctx.lineWidth = 1.2
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + 100, H)
    ctx.stroke()
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // Accent radial flare
  const flare = ctx.createRadialGradient(W * 0.8, H * 0.15, 10, W * 0.8, H * 0.15, 320)
  flare.addColorStop(0, accentColor)
  flare.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = flare
  ctx.fillRect(0, 0, W, H)

  // Razorpay Wordmark
  ctx.font = '700 36px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('razorpay', 52, 78)
  ctx.fillStyle = '#5284FF'
  ctx.fillRect(52, 86, 110, 2.5)

  // Card Tier Name Top-Right
  ctx.font = '600 15px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.fillText(tierName.toUpperCase(), W - 250, 78)

  // Metallic EMV Chip
  const cx = 52, cy = 126, cw = 96, ch = 72
  const chipGrad = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch)
  if (chipGold) {
    chipGrad.addColorStop(0, '#D4AF37')
    chipGrad.addColorStop(0.3, '#FFF3A8')
    chipGrad.addColorStop(0.7, '#C59B27')
    chipGrad.addColorStop(1, '#997A1E')
  } else {
    chipGrad.addColorStop(0, '#B0B8C8')
    chipGrad.addColorStop(0.5, '#E2E8F0')
    chipGrad.addColorStop(1, '#7A8498')
  }
  ctx.fillStyle = chipGrad
  ctx.beginPath()
  ctx.roundRect(cx, cy, cw, ch, 8)
  ctx.fill()

  // Chip circuits
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 1.6
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo(cx + 4, cy + (ch / 5) * i)
    ctx.lineTo(cx + cw - 4, cy + (ch / 5) * i)
    ctx.stroke()
  }
  ctx.strokeRect(cx + cw / 2 - 12, cy + ch / 2 - 10, 24, 20)

  // Contactless RFID Wave
  const ax = cx + cw + 36, ay = cy + ch / 2
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.arc(ax, ay, i * 11, -Math.PI * 0.55, Math.PI * 0.55)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + i * 0.15})`
    ctx.lineWidth = 2.4
    ctx.stroke()
  }

  // Masked Number
  ctx.font = '600 38px "Courier New", monospace'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.fillText('••••  ••••  ••••  8855', 52, H - 135)

  // Cardholder and Expiry
  ctx.font = '500 13px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fillText('CARDHOLDER', 52, H - 85)
  ctx.fillText('EXPIRES', 270, H - 85)

  ctx.font = '600 18px Inter, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('REVENUE RECOVERY', 52, H - 56)
  ctx.fillText('08/29', 270, H - 56)

  // Security holographic dots
  ctx.fillStyle = '#EA4335'
  ctx.beginPath()
  ctx.arc(W - 90, H - 70, 28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(251, 188, 4, 0.85)'
  ctx.beginPath()
  ctx.arc(W - 60, H - 70, 28, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  textureCache[key] = tex
  return tex
}

/* ── 5 Card Data Configurations ────────────────────────────── */
const CARDS = [
  {
    id: 'enterprise',
    name: 'Razorpay Enterprise',
    bg1: '#0C0E16', bg2: '#06080F',
    accent: 'rgba(242, 183, 5, 0.25)',
    chipGold: true,
    basePos: [-2.2, 0.35, -1.1],
    baseRot: [0.12, 0.35, -0.12],
    scrollPos: [-3.2, 0.6, -1.8],
    scrollRot: [0.18, 0.55, -0.22],
  },
  {
    id: 'corporate',
    name: 'Razorpay Corporate',
    bg1: '#091228', bg2: '#050A18',
    accent: 'rgba(82, 132, 255, 0.35)',
    chipGold: true,
    basePos: [-1.1, 0.18, -0.5],
    baseRot: [0.08, 0.2, -0.06],
    scrollPos: [-1.7, 0.3, -0.9],
    scrollRot: [0.12, 0.32, -0.1],
  },
  {
    id: 'revenue', // PRIMARY CENTER CARD
    name: 'Razorpay Revenue',
    bg1: '#0B1636', bg2: '#060E28',
    accent: 'rgba(49, 92, 255, 0.65)',
    chipGold: true,
    basePos: [0.0, 0.05, 0.25],
    baseRot: [-0.04, 0.04, 0.0],
    scrollPos: [0.0, -0.1, 0.8],
    scrollRot: [-0.08, 0.15, -0.04],
    isPrimary: true,
  },
  {
    id: 'business',
    name: 'Razorpay Business',
    bg1: '#111624', bg2: '#080C14',
    accent: 'rgba(124, 143, 255, 0.3)',
    chipGold: false,
    basePos: [1.1, -0.15, -0.5],
    baseRot: [-0.08, -0.2, 0.06],
    scrollPos: [1.7, -0.25, -0.9],
    scrollRot: [-0.12, -0.32, 0.1],
  },
  {
    id: 'growth',
    name: 'Razorpay Growth',
    bg1: '#160E26', bg2: '#090514',
    accent: 'rgba(155, 100, 255, 0.25)',
    chipGold: false,
    basePos: [2.2, -0.3, -1.1],
    baseRot: [-0.12, -0.35, 0.12],
    scrollPos: [3.2, -0.5, -1.8],
    scrollRot: [-0.18, -0.55, 0.22],
  },
]

/* ── Individual 3D Arched Card ───────────────────────────────── */
function ArchedCard({ config, index, mouseX, mouseY, scrollProgress, prefersReduced }) {
  const meshRef = useRef()
  const CW = 3.2, CH = 2.02, CD = 0.045

  const texture = useMemo(
    () => getCardTexture(config.name, config.bg1, config.bg2, config.accent, config.chipGold),
    [config]
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.getElapsedTime()
    const sp = scrollProgress.current || 0

    // Smooth continuous floating oscillation
    const flowY = prefersReduced ? 0 : Math.sin(t * 0.9 + index * 0.7) * 0.07
    const flowRot = prefersReduced ? 0 : Math.cos(t * 0.7 + index * 0.6) * 0.035

    // Mouse parallax
    const px = prefersReduced ? 0 : (mouseX.current || 0) * 0.05
    const py = prefersReduced ? 0 : (mouseY.current || 0) * -0.04

    // Interpolate between Scroll 1 and Scroll 2 positions
    const targetX = THREE.MathUtils.lerp(config.basePos[0], config.scrollPos[0], sp) + px
    const targetY = THREE.MathUtils.lerp(config.basePos[1], config.scrollPos[1], sp) + flowY + py
    const targetZ = THREE.MathUtils.lerp(config.basePos[2], config.scrollPos[2], sp)

    const targetRotX = THREE.MathUtils.lerp(config.baseRot[0], config.scrollRot[0], sp) + py * 0.5
    const targetRotY = THREE.MathUtils.lerp(config.baseRot[1], config.scrollRot[1], sp) + flowRot + px * 0.8
    const targetRotZ = THREE.MathUtils.lerp(config.baseRot[2], config.scrollRot[2], sp)

    meshRef.current.position.set(targetX, targetY, targetZ)
    meshRef.current.rotation.set(targetRotX, targetRotY, targetRotZ)
  })

  return (
    <group ref={meshRef} position={config.basePos} rotation={config.baseRot}>
      {/* Physical Card Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CW, CH, CD]} />
        <meshPhysicalMaterial
          color="#060810"
          roughness={0.28}
          metalness={0.12}
          clearcoat={0.65}
          clearcoatRoughness={0.15}
        />
      </mesh>

      {/* Front Textured Surface */}
      {texture && (
        <mesh position={[0, 0, CD / 2 + 0.001]}>
          <planeGeometry args={[CW - 0.006, CH - 0.006]} />
          <meshStandardMaterial
            map={texture}
            roughness={0.25}
            metalness={0.12}
          />
        </mesh>
      )}

      {/* Subtle Blue Edge Glow on Primary Card */}
      {config.isPrimary && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[CW + 0.02, CH + 0.02, CD + 0.008]} />
          <meshBasicMaterial
            color="#4F6FFF"
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}

/* ── Fallback 2D Card (Prevents Blank Page on slow WebGL init) ── */
function FallbackCard() {
  return (
    <div
      style={{
        width: 320,
        height: 200,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #0A1636 0%, #05070D 100%)',
        border: '1px solid rgba(82, 132, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(49, 92, 255, 0.25)',
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
      <div style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.1em', opacity: 0.8 }}>
        ••••  ••••  ••••  8855
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6 }}>
        <span>CARDHOLDER</span>
        <span>08/29</span>
      </div>
    </div>
  )
}

/* ── Alinma Composition Scene ────────────────────────────────── */
export default function AlinmaHeroScene({ prefersReduced = false }) {
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
      // Map scroll from 0 to 1st screen transition
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
        pointerEvents: 'none', // Critical: Never block navigation or clicks
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.6]} fov={40} />

        {/* Studio Lighting */}
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 5]} intensity={1.3} color="#FFFFFF" />
        <directionalLight position={[-4, 2, 3]} intensity={0.4} color="#80A8FF" />
        <pointLight position={[0, 3, -3]} intensity={4.8} color="#315CFF" distance={14} />
        <pointLight position={[2, -4, 2]} intensity={0.6} color="#F2B705" distance={9} />

        {/* 5 Layered Arched Cards */}
        {CARDS.map((card, idx) => (
          <ArchedCard
            key={card.id}
            config={card}
            index={idx}
            mouseX={mouseX}
            mouseY={mouseY}
            scrollProgress={scrollProgress}
            prefersReduced={prefersReduced}
          />
        ))}

        {/* Floor Contact Shadow */}
        <ContactShadows
          position={[0, -2.1, 0]}
          opacity={0.6}
          scale={12}
          blur={2.8}
          far={4.5}
          color="#00040D"
        />
      </Canvas>
    </div>
  )
}
