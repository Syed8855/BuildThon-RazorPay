'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import Real3DCard from './Real3DCard'

/* ── Canvas Texture for Sleek Dark Card Sleeve ──────────────── */
function getSleeveTexture() {
  if (typeof document === 'undefined') return null
  const W = 512, H = 320
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Dark obsidian leather/paper
  ctx.fillStyle = '#090D18'
  ctx.fillRect(0, 0, W, H)

  // Fine paper noise/grain
  for (let i = 0; i < 4000; i++) {
    const px = Math.random() * W, py = Math.random() * H
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`
    ctx.fillRect(px, py, 1, 1)
  }

  // Embossed horizontal accent lines
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1
  for (let y = 0; y < H; y += 14) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  // RAZORPAY wordmark
  ctx.font = '700 24px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  const tw = ctx.measureText('RAZORPAY').width
  ctx.fillText('RAZORPAY', W / 2 - tw / 2, H / 2 - 10)

  // REVENUE RECOVERY
  ctx.font = '600 13px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(82,132,255,0.55)'
  const tw2 = ctx.measureText('REVENUE RECOVERY DOCK').width
  ctx.fillText('REVENUE RECOVERY DOCK', W / 2 - tw2 / 2, H / 2 + 16)

  // Blue accent line
  ctx.fillStyle = 'rgba(82,132,255,0.45)'
  ctx.fillRect(W / 2 - 40, H / 2 + 26, 80, 1.5)

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  return tex
}

/* ── Sleeve 3D Dock Component (Behance Motion Reference) ───── */
function CardSleeveDock({ scrollProgress }) {
  const sleeveRef = useRef()
  const sleeveTex = useMemo(() => getSleeveTexture(), [])

  const CW = 3.52, CH = 2.22, CD = 0.06

  useFrame(() => {
    if (!sleeveRef.current) return
    const sp = scrollProgress.current || 0
    sleeveRef.current.position.y = THREE.MathUtils.lerp(-1.1, -1.8, sp)
    sleeveRef.current.position.z = THREE.MathUtils.lerp(-0.2, -0.9, sp)
  })

  return (
    <group ref={sleeveRef} position={[0, -1.1, -0.2]}>
      {/* Back sleeve panel */}
      <mesh position={[0, 0, -(CD / 2 + 0.02)]}>
        <boxGeometry args={[CW + 0.16, CH + 0.12, 0.038]} />
        <meshStandardMaterial map={sleeveTex} roughness={0.88} color="#080C16" />
      </mesh>
      {/* Front sleeve pocket */}
      <mesh position={[0, 0, CD / 2 + 0.02]}>
        <boxGeometry args={[CW + 0.16, CH + 0.12, 0.038]} />
        <meshStandardMaterial map={sleeveTex} roughness={0.88} color="#080C16" />
      </mesh>
      {/* Left/Right walls */}
      <mesh position={[-(CW / 2 + 0.07), 0, 0]}>
        <boxGeometry args={[0.038, CH + 0.12, CD + 0.05]} />
        <meshStandardMaterial color="#05070E" roughness={0.9} />
      </mesh>
      <mesh position={[CW / 2 + 0.07, 0, 0]}>
        <boxGeometry args={[0.038, CH + 0.12, CD + 0.05]} />
        <meshStandardMaterial color="#05070E" roughness={0.9} />
      </mesh>
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
   Alinma & Behance Card Motion 3D Scene Component
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
        pointerEvents: 'none',
      }}
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.35,
        }}
        dpr={[1, 2]}
        style={{ pointerEvents: 'none' }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.6]} fov={40} />

        {/* Studio Three-Point Lighting with Rim Highlights */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 7, 6]} intensity={2.2} color="#FFFFFF" />
        <directionalLight position={[-5, 2, 4]} intensity={0.65} color="#80A8FF" />
        <pointLight position={[0, 3, -3]} intensity={6.0} color="#315CFF" distance={16} />
        <pointLight position={[3, -4, 2]} intensity={1.2} color="#F2B705" distance={12} />

        {/* 3D Sleeve Dock (Behance Concept) */}
        <CardSleeveDock scrollProgress={scrollProgress} />

        {/* Primary Behance/Alinma 3D Bank Card with Bevels & Metallic Chip */}
        <Real3DCard
          state={simStage}
          mouseX={mouseX}
          mouseY={mouseY}
          scrollProgress={scrollProgress}
          prefersReduced={prefersReduced}
          isPrimary={true}
        />

        <ContactShadows
          position={[0, -2.1, 0]}
          opacity={0.68}
          scale={12}
          blur={2.8}
          far={4.5}
          color="#00040D"
        />
      </Canvas>
    </div>
  )
}
