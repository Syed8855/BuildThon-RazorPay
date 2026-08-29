'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/* ── Cached Textures ─────────────────────────────────────────── */
let vaultaFrontCache = null
let vaultaBackCache = null

function getVaultaFrontTexture() {
  if (typeof document === 'undefined') return null
  if (vaultaFrontCache) return vaultaFrontCache

  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Dark obsidian/navy gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#0A0E1A')
  bgGrad.addColorStop(0.5, '#05070D')
  bgGrad.addColorStop(1, '#0C1224')
  ctx.fillStyle = bgGrad
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 36)
  ctx.fill()

  // Fine geometric grid pattern
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

  // Blue flare
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

  // Label
  ctx.font = '600 15px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.fillText('REVENUE ENGINE', W - 230, 80)

  // Metallic EMV Chip
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

  // Chip lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 1.8
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo(chipX + 4, chipY + (chipH / 5) * i)
    ctx.lineTo(chipX + chipW - 4, chipY + (chipH / 5) * i)
    ctx.stroke()
  }
  ctx.strokeRect(chipX + chipW / 2 - 12, chipY + chipH / 2 - 10, 24, 20)

  // Contactless wave
  const waveX = chipX + chipW + 36, waveY = chipY + chipH / 2
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.arc(waveX, waveY, i * 11, -Math.PI * 0.55, Math.PI * 0.55)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + i * 0.15})`
    ctx.lineWidth = 2.4
    ctx.stroke()
  }

  // Card Number
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

  // Dual circles
  ctx.fillStyle = '#FF3B30'
  ctx.beginPath()
  ctx.arc(W - 100, H - 75, 30, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 149, 0, 0.85)'
  ctx.beginPath()
  ctx.arc(W - 68, H - 75, 30, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  vaultaFrontCache = tex
  return tex
}

function getVaultaBackTexture() {
  if (typeof document === 'undefined') return null
  if (vaultaBackCache) return vaultaBackCache

  const W = 1024, H = 640
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#060810'
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 36)
  ctx.fill()

  ctx.fillStyle = '#121520'
  ctx.fillRect(0, 70, W, 100)

  ctx.fillStyle = '#E5E8F0'
  ctx.beginPath()
  ctx.roundRect(56, 220, W - 240, 68, 4)
  ctx.fill()
  ctx.font = 'italic 500 16px Georgia, serif'
  ctx.fillStyle = '#6B7280'
  ctx.fillText('Authorized Signature • Revenue Engine', 72, 260)

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(W - 160, 220, 100, 68, 4)
  ctx.fill()
  ctx.font = '700 26px "Courier New", monospace'
  ctx.fillStyle = '#000000'
  ctx.fillText('892', W - 130, 264)

  ctx.font = '400 13px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  ctx.fillText('Issued for Razorpay Autonomous Revenue Optimization.', 56, H - 60)
  ctx.fillText('razorpay.com', W - 160, H - 60)

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  vaultaBackCache = tex
  return tex
}

/* ── Revolving 3D Card ───────────────────────────────────────── */
function VaultaCard({ isReady }) {
  const cardGroup = useRef()
  const frontTex = useMemo(() => getVaultaFrontTexture(), [])
  const backTex = useMemo(() => getVaultaBackTexture(), [])

  const CW = 3.6, CH = 2.26, CD = 0.05

  useFrame((state) => {
    if (!cardGroup.current) return
    const t = state.clock.getElapsedTime()
    const speed = isReady ? 1.4 : 0.85

    cardGroup.current.rotation.y = Math.sin(t * 0.7 * speed) * 0.95 + Math.PI * 0.1
    cardGroup.current.rotation.x = Math.cos(t * 0.5 * speed) * 0.22 - 0.05
    cardGroup.current.rotation.z = Math.sin(t * 0.4 * speed) * 0.12

    cardGroup.current.position.y = Math.sin(t * 1.2) * 0.12
    cardGroup.current.position.z = Math.cos(t * 0.8) * 0.16 + (isReady ? 0.35 : 0)
  })

  return (
    <group ref={cardGroup} position={[0, 0, 0]}>
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

      {frontTex && (
        <mesh position={[0, 0, CD / 2 + 0.001]}>
          <planeGeometry args={[CW - 0.004, CH - 0.004]} />
          <meshStandardMaterial map={frontTex} roughness={0.24} metalness={0.15} />
        </mesh>
      )}

      {backTex && (
        <mesh position={[0, 0, -(CD / 2 + 0.001)]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CW - 0.004, CH - 0.004]} />
          <meshStandardMaterial map={backTex} roughness={0.28} metalness={0.12} />
        </mesh>
      )}

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[CW + 0.02, CH + 0.02, CD + 0.01]} />
        <meshBasicMaterial
          color={isReady ? '#4F6FFF' : '#315CFF'}
          transparent
          opacity={isReady ? 0.45 : 0.18}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

function FallbackVaultaCard() {
  return (
    <div
      style={{
        width: 320,
        height: 200,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #0A0E1A 0%, #05070D 100%)',
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
        <span style={{ fontWeight: 700, fontSize: 16 }}>razorpay</span>
        <span style={{ fontSize: 11, color: '#5284FF', fontWeight: 600 }}>REVENUE ENGINE</span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: '0.1em', opacity: 0.8 }}>
        4242  ••••  ••••  9821
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6 }}>
        <span>CARDHOLDER</span>
        <span>12/29</span>
      </div>
    </div>
  )
}

export default function VaultaLoadingScene({ isReady = false }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <FallbackVaultaCard />
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', pointerEvents: 'none' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5.4]} fov={42} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[4, 5, 4]} intensity={1.2} color="#FFFFFF" />
        <pointLight position={[-4, 2, -3]} intensity={4.5} color="#5284FF" distance={12} />
        <pointLight position={[2, -3, 2]} intensity={0.65} color="#F2B705" distance={8} />

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
