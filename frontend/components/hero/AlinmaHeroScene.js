'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/* ── Generate Textures for the 5 Tier Cards ────────────────── */
function createAlinmaCardTexture(tierName, bgHex1, bgHex2, accentColor, chipGold = true) {
  if (typeof document === 'undefined') return null
  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Base background gradient
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
  const flare = ctx.createRadialGradient(W * 0.8, H * 0.15, 10, W * 0.8, H * 0.15, 300)
  flare.addColorStop(0, accentColor)
  flare.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = flare
  ctx.fillRect(0, 0, W, H)

  // Razorpay Branding Top-Left
  ctx.font = '700 34px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('razorpay', 52, 76)
  ctx.fillStyle = accentColor
  ctx.fillRect(52, 84, 110, 2.5)

  // Card Tier Name Top-Right
  ctx.font = '600 15px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.fillText(tierName.toUpperCase(), W - 240, 76)

  // EMV Chip
  const cx = 52, cy = 120, cw = 92, ch = 68
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
  ctx.lineWidth = 1.5
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo(cx + 3, cy + (ch / 5) * i)
    ctx.lineTo(cx + cw - 3, cy + (ch / 5) * i)
    ctx.stroke()
  }
  ctx.strokeRect(cx + cw / 2 - 11, cy + ch / 2 - 9, 22, 18)

  // Contactless icon
  const ax = cx + cw + 32, ay = cy + ch / 2
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.arc(ax, ay, i * 10, -Math.PI * 0.55, Math.PI * 0.55)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + i * 0.15})`
    ctx.lineWidth = 2.2
    ctx.stroke()
  }

  // Masked Number
  ctx.font = '600 36px "Courier New", monospace'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillText('••••  ••••  ••••  8855', 52, H - 135)

  // Cardholder and Expiry
  ctx.font = '500 13px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fillText('CARDHOLDER', 52, H - 85)
  ctx.fillText('EXPIRES', 260, H - 85)

  ctx.font = '600 18px Inter, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('REVENUE ENGINE', 52, H - 56)
  ctx.fillText('08/29', 260, H - 56)

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
  tex.anisotropy = 8
  return tex
}

/* ── 5 Card Data Configurations ────────────────────────────── */
const CARDS = [
  {
    id: 'enterprise',
    name: 'Razorpay Enterprise',
    bg1: '#0B0D14', bg2: '#06080F',
    accent: 'rgba(242, 183, 5, 0.25)',
    chipGold: true,
    basePos: [-2.1, 0.4, -1.2],
    baseRot: [0.12, 0.38, -0.15],
  },
  {
    id: 'corporate',
    name: 'Razorpay Corporate',
    bg1: '#081024', bg2: '#050A18',
    accent: 'rgba(82, 132, 255, 0.35)',
    chipGold: true,
    basePos: [-1.1, 0.2, -0.6],
    baseRot: [0.08, 0.22, -0.08],
  },
  {
    id: 'revenue', // PRIMARY CENTER CARD
    name: 'Razorpay Revenue',
    bg1: '#0A1432', bg2: '#060E26',
    accent: 'rgba(49, 92, 255, 0.55)',
    chipGold: true,
    basePos: [0.1, 0.05, 0.25],
    baseRot: [-0.04, 0.04, 0.02],
    isPrimary: true,
  },
  {
    id: 'business',
    name: 'Razorpay Business',
    bg1: '#101420', bg2: '#080C14',
    accent: 'rgba(124, 143, 255, 0.3)',
    chipGold: false,
    basePos: [1.3, -0.15, -0.6],
    baseRot: [-0.08, -0.22, 0.08],
  },
  {
    id: 'growth',
    name: 'Razorpay Growth',
    bg1: '#140E24', bg2: '#090514',
    accent: 'rgba(155, 100, 255, 0.25)',
    chipGold: false,
    basePos: [2.3, -0.3, -1.2],
    baseRot: [-0.12, -0.38, 0.15],
  },
]

/* ── Individual 3D Arched Card ───────────────────────────────── */
function ArchedCard({ config, index, mouseX, mouseY, txState, prefersReduced }) {
  const meshRef = useRef()
  const CW = 3.2, CH = 2.02, CD = 0.045

  const texture = useMemo(
    () => createAlinmaCardTexture(config.name, config.bg1, config.bg2, config.accent, config.chipGold),
    [config]
  )

  useFrame((state) => {
    if (!meshRef.current || prefersReduced) return
    const t = state.clock.getElapsedTime()

    // Base position with synchronized flowing oscillation
    const flowOffset = Math.sin(t * 0.9 + index * 0.7) * 0.08
    const flowRotY = Math.cos(t * 0.7 + index * 0.6) * 0.04

    // Mouse parallax responsiveness (3–5 deg)
    const parallaxX = (mouseX.current || 0) * 0.06
    const parallaxY = (mouseY.current || 0) * -0.05

    // Transaction state reaction on the primary card
    let txElevate = 0
    let txRotY = 0
    let txRotX = 0

    if (config.isPrimary && txState) {
      if (txState === 'processing') {
        txElevate = Math.sin(t * 8) * 0.06 + 0.15
        txRotY = Math.sin(t * 4) * 0.1
      } else if (txState === 'failed') {
        txElevate = 0.05
        txRotX = -0.12
        txRotY = -0.15
      } else if (txState === 'recovered' || txState === 'success') {
        txElevate = 0.22
        txRotY = Math.sin(t * 2) * 0.15 + Math.PI * 2 // full clean 360 turn settle
        txRotX = 0.04
      }
    }

    meshRef.current.position.x = config.basePos[0] + parallaxX
    meshRef.current.position.y = config.basePos[1] + flowOffset + parallaxY + txElevate
    meshRef.current.position.z = config.basePos[2] + (config.isPrimary && txState ? 0.3 : 0)

    meshRef.current.rotation.x = config.baseRot[0] + parallaxY * 0.5 + txRotX
    meshRef.current.rotation.y = config.baseRot[1] + flowRotY + parallaxX * 0.8 + txRotY
    meshRef.current.rotation.z = config.baseRot[2] + (flowOffset * 0.3)
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
          clearcoat={0.7}
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

      {/* Blue Rim Illumination on Primary Card */}
      {config.isPrimary && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[CW + 0.02, CH + 0.02, CD + 0.008]} />
          <meshBasicMaterial
            color={txState === 'recovered' ? '#4F6FFF' : '#315CFF'}
            transparent
            opacity={txState === 'recovered' ? 0.45 : 0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}

/* ── Alinma Composition Scene ────────────────────────────────── */
export default function AlinmaHeroScene({ txState = null, prefersReduced = false }) {
  const mouseX = useRef(0)
  const mouseY = useRef(0)

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.current = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY.current = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0.2, 0, 5.8]} fov={38} />

        {/* Alinma-Style Studio Lighting */}
        <ambientLight intensity={0.3} />
        {/* Key Light */}
        <directionalLight position={[4, 6, 5]} intensity={1.35} color="#FFFFFF" />
        {/* Soft Blue Fill */}
        <directionalLight position={[-4, 2, 3]} intensity={0.45} color="#80A8FF" />
        {/* Blue Rim Accent Light behind arc */}
        <pointLight position={[0, 3, -3]} intensity={5.0} color="#315CFF" distance={14} />
        {/* Warm Subtle Fill from Bottom */}
        <pointLight position={[2, -4, 2]} intensity={0.65} color="#F2B705" distance={9} />

        {/* The 5 Layered Arched Cards */}
        {CARDS.map((card, idx) => (
          <ArchedCard
            key={card.id}
            config={card}
            index={idx}
            mouseX={mouseX}
            mouseY={mouseY}
            txState={txState}
            prefersReduced={prefersReduced}
          />
        ))}

        {/* Contact Shadow Floor */}
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
