'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/* ── Generate Luxury Card Textures (Razorpay Enterprise Edition) ──────────────── */
function createCardFrontTexture() {
  if (typeof document === 'undefined') return null
  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Deep obsidian/navy background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#090D18')
  bgGrad.addColorStop(0.5, '#05070D')
  bgGrad.addColorStop(1, '#0C1222')
  ctx.fillStyle = bgGrad
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 36)
  ctx.fill()

  // Fine geometric guilloche / isometric grid pattern
  ctx.strokeStyle = 'rgba(82, 132, 255, 0.04)'
  ctx.lineWidth = 1.2
  for (let x = 0; x <= W; x += 36) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + 120, H)
    ctx.stroke()
  }
  for (let y = 0; y <= H; y += 36) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // Subtle electric blue ambient accent curve
  const blueGlow = ctx.createRadialGradient(W * 0.85, H * 0.2, 10, W * 0.85, H * 0.2, 350)
  blueGlow.addColorStop(0, 'rgba(82, 132, 255, 0.25)')
  blueGlow.addColorStop(0.6, 'rgba(49, 92, 255, 0.06)')
  blueGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = blueGlow
  ctx.fillRect(0, 0, W, H)

  // Razorpay Wordmark
  ctx.font = '700 36px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('razorpay', 56, 80)
  ctx.fillStyle = '#5284FF'
  ctx.fillRect(56, 88, 120, 2.5)

  // Premium Tier Label
  ctx.font = '600 15px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.fillText('REVENUE ENGINE', W - 230, 80)

  // EMV Chip with realistic metallic brushed reflection
  const chipX = 56, chipY = 130, chipW = 96, chipH = 72
  const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH)
  chipGrad.addColorStop(0, '#D4AF37')
  chipGrad.addColorStop(0.3, '#FFF3A8')
  chipGrad.addColorStop(0.7, '#C59B27')
  chipGrad.addColorStop(1, '#997A1E')
  ctx.fillStyle = chipGrad
  ctx.beginPath()
  ctx.roundRect(chipX, chipY, chipW, chipH, 8)
  ctx.fill()

  // Chip contact circuits
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 1.8
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo(chipX + 4, chipY + (chipH / 5) * i)
    ctx.lineTo(chipX + chipW - 4, chipY + (chipH / 5) * i)
    ctx.stroke()
  }
  ctx.strokeRect(chipX + chipW / 2 - 12, chipY + chipH / 2 - 10, 24, 20)

  // Contactless RFID Wave icon
  const waveX = chipX + chipW + 36, waveY = chipY + chipH / 2
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.arc(waveX, waveY, i * 11, -Math.PI * 0.55, Math.PI * 0.55)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + i * 0.15})`
    ctx.lineWidth = 2.4
    ctx.stroke()
  }

  // Card Number (Embossed look)
  ctx.font = '600 38px "Courier New", monospace'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.fillText('4242  ••••  ••••  9821', 56, H - 140)

  // Cardholder and Expiry
  ctx.font = '500 13px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fillText('CARDHOLDER', 56, H - 90)
  ctx.fillText('VALID THRU', 280, H - 90)

  ctx.font = '600 19px Inter, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('REVENUE RECOVERY', 56, H - 60)
  ctx.fillText('12/29', 280, H - 60)

  // Holographic Dual Security Circles
  ctx.fillStyle = '#FF3B30'
  ctx.beginPath()
  ctx.arc(W - 100, H - 75, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 149, 0, 0.85)'
  ctx.beginPath()
  ctx.arc(W - 68, H - 75, 30, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  return tex
}

function createCardBackTexture() {
  if (typeof document === 'undefined') return null
  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Back base
  ctx.fillStyle = '#060810'
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 36)
  ctx.fill()

  // Magnetic Stripe
  ctx.fillStyle = '#121520'
  ctx.fillRect(0, 70, W, 100)

  // Signature Strip
  ctx.fillStyle = '#E5E8F0'
  ctx.beginPath()
  ctx.roundRect(56, 220, W - 240, 68, 4)
  ctx.fill()
  ctx.font = 'italic 500 16px Georgia, serif'
  ctx.fillStyle = '#6B7280'
  ctx.fillText('Authorized Signature • Revenue Engine', 72, 260)

  // CVV Box
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(W - 160, 220, 100, 68, 4)
  ctx.fill()
  ctx.font = '700 26px "Courier New", monospace'
  ctx.fillStyle = '#000000'
  ctx.fillText('892', W - 130, 264)

  // Bottom Notice
  ctx.font = '400 13px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.fillText('Issued for Razorpay Autonomous Revenue Optimization.', 56, H - 60)
  ctx.fillText('razorpay.com', W - 160, H - 60)

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 8
  return tex
}

/* ── Vaulta Revolving 3D Card ────────────────────────────────── */
function VaultaCard({ isReady }) {
  const cardGroup = useRef()
  const frontTex = useMemo(() => createCardFrontTexture(), [])
  const backTex = useMemo(() => createCardBackTexture(), [])

  // Card dimensions (ISO/IEC 7810 standard ratio)
  const CW = 3.6, CH = 2.26, CD = 0.05

  useFrame((state, delta) => {
    if (!cardGroup.current) return
    const t = state.clock.getElapsedTime()

    // Smooth Vaulta-style floating orbit:
    // Seamless continuous multi-axis cinematic tumble with inertia
    const speed = isReady ? 1.4 : 0.8
    cardGroup.current.rotation.y = Math.sin(t * 0.7 * speed) * 0.95 + Math.PI * 0.1
    cardGroup.current.rotation.x = Math.cos(t * 0.5 * speed) * 0.22 - 0.05
    cardGroup.current.rotation.z = Math.sin(t * 0.4 * speed) * 0.12

    // Vertical floating hover
    cardGroup.current.position.y = Math.sin(t * 1.2) * 0.14
    cardGroup.current.position.z = Math.cos(t * 0.8) * 0.18 + (isReady ? 0.4 : 0)
  })

  return (
    <group ref={cardGroup} position={[0, 0, 0]}>
      {/* 3D Physical Card Core Body with chamfered edge look */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CW, CH, CD]} />
        <meshPhysicalMaterial
          color="#060810"
          roughness={0.28}
          metalness={0.12}
          clearcoat={0.65}
          clearcoatRoughness={0.15}
          reflectivity={0.9}
        />
      </mesh>

      {/* Front Face */}
      {frontTex && (
        <mesh position={[0, 0, CD / 2 + 0.001]}>
          <planeGeometry args={[CW - 0.004, CH - 0.004]} />
          <meshStandardMaterial
            map={frontTex}
            roughness={0.24}
            metalness={0.15}
          />
        </mesh>
      )}

      {/* Back Face */}
      {backTex && (
        <mesh position={[0, 0, -(CD / 2 + 0.001)]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CW - 0.004, CH - 0.004]} />
          <meshStandardMaterial
            map={backTex}
            roughness={0.28}
            metalness={0.12}
          />
        </mesh>
      )}

      {/* Ambient Electric Blue Rim Glow when Ready */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[CW + 0.02, CH + 0.02, CD + 0.01]} />
        <meshBasicMaterial
          color={isReady ? '#4F6FFF' : '#315CFF'}
          transparent
          opacity={isReady ? 0.45 : 0.18}
          wireframe={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

export default function VaultaLoadingScene({ isReady = false }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.4]} fov={42} />

        {/* Cinematic Studio Lighting per Vaulta reference */}
        <ambientLight intensity={0.25} />
        {/* Soft Key Light from Top-Right */}
        <directionalLight position={[4, 5, 4]} intensity={1.2} color="#FFFFFF" />
        {/* Cool Blue Rim Light from Behind-Left */}
        <pointLight position={[-4, 2, -3]} intensity={4.5} color="#5284FF" distance={12} />
        {/* Warm Gold Reflection from Below */}
        <pointLight position={[2, -3, 2]} intensity={0.65} color="#F2B705" distance={8} />
        {/* Subtle Overhead Cyan Glint */}
        <spotLight position={[0, 6, 2]} intensity={1.8} angle={0.6} penumbra={0.8} color="#90B8FF" />

        <VaultaCard isReady={isReady} />

        <ContactShadows
          position={[0, -1.8, 0]}
          opacity={0.65}
          scale={7}
          blur={2.5}
          far={4}
          color="#00040D"
        />
      </Canvas>
    </div>
  )
}
