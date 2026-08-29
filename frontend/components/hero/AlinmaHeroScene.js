'use client'

import { useRef, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import Real3DCard from './Real3DCard'

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

        {/* High-Intensity Metallic Studio Lighting */}
        <ambientLight intensity={0.45} />
        <directionalLight position={[5, 7, 6]} intensity={2.2} color="#FFFFFF" />
        <directionalLight position={[-5, 2, 4]} intensity={0.6} color="#80A8FF" />
        <pointLight position={[0, 3, -3]} intensity={6.0} color="#315CFF" distance={16} />
        <pointLight position={[3, -4, 2]} intensity={1.2} color="#F2B705" distance={12} />

        {/* Primary 3D Bank Card with Extruded Rounded Bevels & Raised Metallic Chip */}
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
