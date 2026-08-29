'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/* ── Texture Caching ───────────────────────────────────────────── */
const textureCache = {}

export function getCardFrontTexture(branding = 'REVENUE RECOVERY', cardNumber = '••••  ••••  ••••  4287', cardholder = 'CARDHOLDER NAME') {
  if (typeof document === 'undefined') return null
  const key = `front-${branding}-${cardNumber}-${cardholder}`
  if (textureCache[key]) return textureCache[key]

  const W = 1024, H = 646 // 1.585 ratio
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Base Obsidian / Deep Navy Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, W, H)
  bgGrad.addColorStop(0, '#0B101C')
  bgGrad.addColorStop(0.4, '#05070D')
  bgGrad.addColorStop(1, '#0C1428')
  ctx.fillStyle = bgGrad
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 36)
  ctx.fill()

  // Fine luxury geometric grid pattern
  ctx.strokeStyle = 'rgba(82, 132, 255, 0.045)'
  ctx.lineWidth = 1.2
  for (let x = -H; x <= W + H; x += 36) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + H, H)
    ctx.stroke()
  }

  // Radial Specular Accent Flare
  const flare = ctx.createRadialGradient(W * 0.85, H * 0.18, 10, W * 0.85, H * 0.18, 380)
  flare.addColorStop(0, 'rgba(82, 132, 255, 0.28)')
  flare.addColorStop(0.5, 'rgba(49, 92, 255, 0.08)')
  flare.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = flare
  ctx.fillRect(0, 0, W, H)

  // Razorpay Logo
  ctx.font = '700 38px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('razorpay', 56, 82)
  ctx.fillStyle = '#5284FF'
  ctx.fillRect(56, 92, 126, 3)

  // Sub-brand Badge Top-Right
  ctx.font = '600 14px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.letterSpacing = '0.08em'
  ctx.fillText(branding.toUpperCase(), W - 270, 80)

  // Metallic 3D EMV Chip
  const chipX = 56, chipY = 132, chipW = 98, chipH = 74
  const chipGrad = ctx.createLinearGradient(chipX, chipY, chipX + chipW, chipY + chipH)
  chipGrad.addColorStop(0, '#E5C158')
  chipGrad.addColorStop(0.3, '#FFF4B8')
  chipGrad.addColorStop(0.7, '#D4A827')
  chipGrad.addColorStop(1, '#997715')
  ctx.fillStyle = chipGrad
  ctx.beginPath()
  ctx.roundRect(chipX, chipY, chipW, chipH, 10)
  ctx.fill()

  // Chip contact circuits
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.lineWidth = 1.8
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo(chipX + 4, chipY + (chipH / 5) * i)
    ctx.lineTo(chipX + chipW - 4, chipY + (chipH / 5) * i)
    ctx.stroke()
  }
  ctx.strokeRect(chipX + chipW / 2 - 14, chipY + chipH / 2 - 12, 28, 24)

  // Contactless RFID Wave Symbol
  const waveX = chipX + chipW + 36, waveY = chipY + chipH / 2
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath()
    ctx.arc(waveX, waveY, i * 11, -Math.PI * 0.55, Math.PI * 0.55)
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + i * 0.15})`
    ctx.lineWidth = 2.4
    ctx.stroke()
  }

  // Embossed Card Number
  ctx.font = '600 38px "Courier New", monospace'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.fillText(cardNumber, 56, H - 140)

  // Cardholder Label & Name
  ctx.font = '500 12px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  ctx.fillText('CARDHOLDER', 56, H - 90)
  ctx.fillText('EXPIRES', 310, H - 90)

  ctx.font = '600 18px Inter, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(cardholder, 56, H - 60)
  ctx.fillText('08/29', 310, H - 60)

  // Razorpay Abstract Overlapping Hologram Circles
  ctx.fillStyle = 'rgba(82, 132, 255, 0.85)'
  ctx.beginPath()
  ctx.arc(W - 104, H - 75, 32, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(49, 92, 255, 0.75)'
  ctx.beginPath()
  ctx.arc(W - 70, H - 75, 32, 0, Math.PI * 2)
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  textureCache[key] = tex
  return tex
}

export function getCardBackTexture() {
  if (typeof document === 'undefined') return null
  const key = 'back-standard'
  if (textureCache[key]) return textureCache[key]

  const W = 1024, H = 646
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Dark obsidian back
  ctx.fillStyle = '#060810'
  ctx.beginPath()
  ctx.roundRect(0, 0, W, H, 36)
  ctx.fill()

  // Magnetic Stripe
  ctx.fillStyle = '#101420'
  ctx.fillRect(0, 72, W, 106)

  // Signature Strip
  ctx.fillStyle = '#E2E8F0'
  ctx.beginPath()
  ctx.roundRect(56, 226, W - 250, 68, 6)
  ctx.fill()

  ctx.font = 'italic 500 16px Georgia, serif'
  ctx.fillStyle = '#64748B'
  ctx.fillText('Authorized Signature • Razorpay Revenue Recovery', 72, 266)

  // CVV Box
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(W - 170, 226, 114, 68, 6)
  ctx.fill()

  ctx.font = '700 28px "Courier New", monospace'
  ctx.fillStyle = '#0F172A'
  ctx.fillText('4287', W - 142, 268)

  // Back Branding & Notice
  ctx.font = '400 13px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.fillText('Issued for Razorpay Autonomous Revenue Recovery Engine.', 56, H - 60)
  ctx.fillText('razorpay.com/recovery', W - 220, H - 60)

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy = 4
  textureCache[key] = tex
  return tex
}

/* ── 3D Card Geometry Helper with Real 1.586 Ratio & Rounded Corners ── */
function createCardShape(w, h, r) {
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

export default function Real3DCard({
  state = 'idle',
  mouseX,
  mouseY,
  scrollProgress,
  prefersReduced = false,
  branding = 'REVENUE RECOVERY',
  cardNumber = '••••  ••••  ••••  4287',
  cardholder = 'CARDHOLDER NAME',
  width = 3.4,
}) {
  const groupRef = useRef()
  const meshRef = useRef()

  // Card dimensions adhering to 1.586 : 1 ratio
  const height = width / 1.586
  const depth = 0.05
  const radius = 0.18

  const frontTex = useMemo(() => getCardFrontTexture(branding, cardNumber, cardholder), [branding, cardNumber, cardholder])
  const backTex = useMemo(() => getCardBackTexture(), [])

  // Create rounded extrude geometry
  const geometry = useMemo(() => {
    const shape = createCardShape(width, height, radius)
    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    }
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geo.center()
    return geo
  }, [width, height, depth, radius])

  useFrame((stateObj) => {
    if (!groupRef.current) return
    const t = stateObj.clock.getElapsedTime()
    const sp = scrollProgress ? scrollProgress.current || 0 : 0

    // Interactive mouse parallax
    const px = prefersReduced ? 0 : (mouseX ? mouseX.current || 0 : 0) * 0.08
    const py = prefersReduced ? 0 : (mouseY ? mouseY.current || 0 : 0) * -0.06

    // Physical card choreography matching Alinma Bank animation reference:
    // Front -> 45° -> Side -> Back -> Front continuous elegant rotation
    let baseRotY = Math.sin(t * 0.45) * 0.85 + Math.PI * 0.06
    let baseRotX = Math.cos(t * 0.35) * 0.18 - 0.04
    let baseRotZ = Math.sin(t * 0.25) * 0.08
    let posY = Math.sin(t * 1.1) * 0.08
    let posX = 0
    let posZ = 0

    // Simulation State Reactions (Requirements 11 & 13)
    if (state === 'initiated') {
      baseRotY += Math.sin(t * 2) * 0.1
      posZ += 0.2
    } else if (state === 'failed') {
      baseRotX += Math.sin(t * 8) * 0.04 // Shake
      baseRotY += Math.cos(t * 8) * 0.04
    } else if (state === 'analyzing') {
      baseRotY = t * 1.8 // Continuous inspection spin
      baseRotX = 0.1
      posY += Math.sin(t * 3) * 0.12
    } else if (state === 'retrying') {
      baseRotY = Math.PI * 0.25 // Optimal angle flip
      baseRotX = -0.15
      posZ += 0.4
    } else if (state === 'recovered') {
      baseRotY = Math.PI * 2 * Math.min(1, t % 2) // Celebration spin
      baseRotX = Math.sin(t * 2) * 0.1
      posY += Math.sin(t * 4) * 0.15 + 0.1
      posZ += 0.5
    }

    // Apply scroll interpolation if present
    if (sp > 0) {
      posX += sp * 0.3
      posY -= sp * 0.2
      baseRotY += sp * 0.4
    }

    groupRef.current.position.set(posX + px, posY + py, posZ)
    groupRef.current.rotation.set(baseRotX + py * 0.5, baseRotY + px * 0.8, baseRotZ)
  })

  // Determine glow color based on simulation state
  const glowColor =
    state === 'recovered'
      ? '#F2B705'
      : state === 'failed'
      ? '#C97070'
      : state === 'analyzing' || state === 'retrying'
      ? '#5284FF'
      : '#315CFF'

  const glowOpacity = state === 'recovered' ? 0.65 : state === 'analyzing' ? 0.5 : 0.25

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 3D Physical Extruded Mesh */}
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#080C16"
          roughness={0.24}
          metalness={0.18}
          clearcoat={0.7}
          clearcoatRoughness={0.12}
          reflectivity={0.9}
        />
      </mesh>

      {/* Front Surface Texture */}
      {frontTex && (
        <mesh position={[0, 0, depth / 2 + 0.013]}>
          <planeGeometry args={[width - 0.02, height - 0.02]} />
          <meshStandardMaterial map={frontTex} roughness={0.22} metalness={0.15} />
        </mesh>
      )}

      {/* Back Surface Texture */}
      {backTex && (
        <mesh position={[0, 0, -(depth / 2 + 0.013)]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[width - 0.02, height - 0.02]} />
          <meshStandardMaterial map={backTex} roughness={0.25} metalness={0.12} />
        </mesh>
      )}

      {/* Ambient Edge Glow Mesh */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width + 0.06, height + 0.06, depth + 0.02]} />
        <meshBasicMaterial color={glowColor} transparent opacity={glowOpacity} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}
