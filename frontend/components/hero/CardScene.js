'use client'
// CardScene.js — React Three Fiber 3D card + sleeve scene
// Implements the full animation sequence from the hero spec:
//   0.0–0.5s  sleeve appears
//   0.5–1.4s  card slides out
//   1.4–1.9s  card moves toward camera
//   1.9–2.5s  3D flip (rotateY with X/Z tilt)
//   2.5–3.0s  settle into hero position + tiny overshoot
//   3.0s+     float + mouse parallax (3–5 degrees)
// prefers-reduced-motion: skip straight to settled state, simple fade.

import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/* ── Easing ─────────────────────────────────────────────────── */
const easeOut3   = t => 1 - Math.pow(1 - t, 3)
const easeInOut3 = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2
const clamp      = (v,a,b) => Math.min(Math.max(v,a),b)
const lerp       = (a,b,t) => a + (b-a)*t

/* ── Dimensions ─────────────────────────────────────────────── */
const CW = 3.40   // card width
const CH = 2.15   // card height
const CD = 0.046  // card depth
const SY = -0.95  // sleeve Y center
const CARD_START_Y = -1.55   // initial: mostly inside sleeve
const CARD_END_X   =  1.15   // hero resting X
const CARD_END_Y   =  0.08
const CARD_END_Z   =  0.35

/* ── Canvas textures ────────────────────────────────────────── */
function cardFrontTex() {
  const W = 1024, H = 640
  const c = document.createElement('canvas'); c.width=W; c.height=H
  const x = c.getContext('2d')

  // Base
  x.fillStyle = '#080810'
  x.beginPath(); x.roundRect(0,0,W,H,36); x.fill()

  // Blue gradient overlay
  const g = x.createLinearGradient(0,0,W*0.6,H)
  g.addColorStop(0,'rgba(49,92,255,0.09)'); g.addColorStop(1,'rgba(0,0,0,0)')
  x.fillStyle=g; x.beginPath(); x.roundRect(0,0,W,H,36); x.fill()

  // Subtle micro-grid
  x.strokeStyle='rgba(255,255,255,0.028)'; x.lineWidth=1
  for(let i=0;i<W;i+=44){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}
  for(let i=0;i<H;i+=44){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke()}

  // Razorpay wordmark — top left
  x.font='700 32px Inter,system-ui,sans-serif'; x.fillStyle='#FFFFFF'
  x.globalAlpha=0.92; x.fillText('razorpay',52,76); x.globalAlpha=1
  x.fillStyle='#5284FF'; x.fillRect(52,83,104,2)

  // EMV Chip
  const [cx,cy,cw,ch] = [52,108,88,66]
  const cg = x.createLinearGradient(cx,cy,cx+cw,cy+ch)
  cg.addColorStop(0,'#C9A84C'); cg.addColorStop(0.35,'#F5D97A')
  cg.addColorStop(0.65,'#C9A84C'); cg.addColorStop(1,'#9A7A30')
  x.fillStyle=cg; x.beginPath(); x.roundRect(cx,cy,cw,ch,6); x.fill()
  // chip lines
  x.strokeStyle='rgba(0,0,0,0.28)'; x.lineWidth=1.5
  for(let i=1;i<5;i++){x.beginPath();x.moveTo(cx+3,cy+(ch/5)*i);x.lineTo(cx+cw-3,cy+(ch/5)*i);x.stroke()}
  for(let i=1;i<4;i++){x.beginPath();x.moveTo(cx+(cw/4)*i,cy+3);x.lineTo(cx+(cw/4)*i,cy+ch-3);x.stroke()}
  x.fillStyle='rgba(0,0,0,0.18)'; x.fillRect(cx+cw/2-11,cy+ch/2-9,22,18)

  // Contactless arcs
  const [ax,ay] = [cx+cw+44,cy+ch/2]
  for(let i=1;i<=4;i++){
    x.beginPath(); x.arc(ax,ay,i*11,-Math.PI*0.62,Math.PI*0.62)
    x.strokeStyle=`rgba(255,255,255,${0.12+i*0.09})`; x.lineWidth=2.4; x.stroke()
  }

  // Card number
  x.font='600 38px "Courier New",monospace'
  x.fillStyle='rgba(255,255,255,0.82)'
  x.fillText('••••  ••••  ••••  4242',52,H-128)

  // Labels
  x.font='500 16px Inter,system-ui,sans-serif'; x.fillStyle='rgba(255,255,255,0.38)'
  x.fillText('VALID THRU',52,H-80); x.fillText('CARD HOLDER',240,H-80)

  // Values
  x.font='600 22px Inter,system-ui,sans-serif'; x.fillStyle='rgba(255,255,255,0.82)'
  x.fillText('08 / 28',52,H-52); x.fillText('REVENUE RECOVERY',240,H-52)

  // Network circles
  const [nx,ny,nr] = [W-88,H-68,33]
  x.globalAlpha=0.88
  x.fillStyle='#CC0000'; x.beginPath(); x.arc(nx,ny,nr,0,Math.PI*2); x.fill()
  x.fillStyle='#FF9900'; x.beginPath(); x.arc(nx+34,ny,nr,0,Math.PI*2); x.fill()
  x.globalAlpha=1

  // Holographic shimmer strip
  const sh=x.createLinearGradient(0,H*0.55,W,H)
  sh.addColorStop(0,'rgba(49,92,255,0)'); sh.addColorStop(0.5,'rgba(82,132,255,0.045)')
  sh.addColorStop(1,'rgba(255,255,255,0.025)')
  x.fillStyle=sh; x.fillRect(0,H*0.55,W,H*0.45)

  return new THREE.CanvasTexture(c)
}

function cardBackTex() {
  const W=1024,H=640
  const c=document.createElement('canvas'); c.width=W; c.height=H
  const x=c.getContext('2d')

  x.fillStyle='#06060C'; x.beginPath(); x.roundRect(0,0,W,H,36); x.fill()
  // Magnetic stripe
  x.fillStyle='#181820'; x.fillRect(0,74,W,108)
  // Signature strip
  const sg=x.createLinearGradient(52,238,52,314)
  sg.addColorStop(0,'#EDEAE2'); sg.addColorStop(1,'#E8E5DC')
  x.fillStyle=sg; x.beginPath(); x.roundRect(52,238,W-220,76,4); x.fill()
  x.font='italic 500 18px Georgia,serif'; x.fillStyle='rgba(0,0,0,0.28)'
  x.fillText('Authorized Signature',70,282)
  // CVV
  x.fillStyle='#FFFFFF'; x.beginPath(); x.roundRect(W-164,238,108,76,4); x.fill()
  x.font='700 30px "Courier New",monospace'; x.fillStyle='#000000'
  x.fillText('452',W-147,288)

  // Back branding
  x.font='500 22px Inter,system-ui,sans-serif'; x.fillStyle='rgba(255,255,255,0.25)'
  x.fillText('razorpay',52,H-56); x.fillText('razorpay.com',W-196,H-56)

  // Blue accent line bottom
  x.fillStyle='rgba(82,132,255,0.25)'; x.fillRect(0,H-28,W,1)

  return new THREE.CanvasTexture(c)
}

function sleeveTex() {
  const W=512,H=320
  const c=document.createElement('canvas'); c.width=W; c.height=H
  const x=c.getContext('2d')

  // Dark paper
  x.fillStyle='#10101A'; x.fillRect(0,0,W,H)
  // Paper noise
  for(let i=0;i<5000;i++){
    const px=Math.random()*W, py=Math.random()*H
    x.fillStyle=`rgba(255,255,255,${Math.random()*0.07})`
    x.fillRect(px,py,1,1)
  }
  // Horizontal emboss lines
  x.strokeStyle='rgba(255,255,255,0.035)'; x.lineWidth=1
  for(let y=0;y<H;y+=14){x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke()}

  // RAZORPAY text
  x.font='700 26px Inter,system-ui,sans-serif'
  x.fillStyle='rgba(255,255,255,0.18)'
  const tw=x.measureText('RAZORPAY').width
  x.fillText('RAZORPAY',W/2-tw/2,H/2-10)

  // REVENUE RECOVERY
  x.font='500 14px Inter,system-ui,sans-serif'
  x.fillStyle='rgba(82,132,255,0.45)'
  const tw2=x.measureText('REVENUE RECOVERY').width
  x.fillText('REVENUE RECOVERY',W/2-tw2/2,H/2+16)

  // Blue accent line
  x.fillStyle='rgba(82,132,255,0.35)'; x.fillRect(W/2-36,H/2+26,72,1)

  return new THREE.CanvasTexture(c)
}

/* ── Card + Sleeve mesh ─────────────────────────────────────── */
function CardAndSleeve({ mouseX, mouseY, prefersReduced }) {
  const cardRef  = useRef()
  const sleeveRef = useRef()
  const elapsed  = useRef(0)
  const done     = useRef(false)

  const frontTex = useMemo(() => typeof window!=='undefined' ? cardFrontTex() : null, [])
  const backTex  = useMemo(() => typeof window!=='undefined' ? cardBackTex()  : null, [])
  const slvTex   = useMemo(() => typeof window!=='undefined' ? sleeveTex()    : null, [])

  // prefers-reduced-motion: jump straight to settled state
  useEffect(() => {
    if (!prefersReduced || !cardRef.current) return
    cardRef.current.position.set(CARD_END_X, CARD_END_Y, CARD_END_Z)
    cardRef.current.rotation.set(-0.05, Math.PI + 0.05, 0)
    done.current = true
  }, [prefersReduced])

  useFrame((state, delta) => {
    if (!cardRef.current || prefersReduced) return
    const t = (elapsed.current += delta)

    if (!done.current) {
      // ── Phase 1: card slides out of sleeve (0.5 → 1.4s)
      if (t >= 0.5 && t < 1.4) {
        const p = easeOut3(clamp((t-0.5)/0.9, 0, 1))
        cardRef.current.position.y = lerp(CARD_START_Y, 0.18, p)
        cardRef.current.rotation.z = lerp(0.018, -0.005, p)
        // sleeve reacts slightly
        if (sleeveRef.current) sleeveRef.current.rotation.z = lerp(0, 0.006, p)
      }

      // ── Phase 2: card toward camera (1.4 → 1.9s)
      if (t >= 1.4 && t < 1.9) {
        const p = easeInOut3(clamp((t-1.4)/0.5, 0, 1))
        cardRef.current.position.z = lerp(0, 2.0, p)
        cardRef.current.position.y = lerp(0.18, 0.35, p)
        // slight forward tilt as it approaches
        cardRef.current.rotation.x = lerp(0, 0.08, p)
      }

      // ── Phase 3: 3D flip (1.9 → 2.5s)
      if (t >= 1.9 && t < 2.5) {
        const p = easeInOut3(clamp((t-1.9)/0.6, 0, 1))
        cardRef.current.rotation.y = lerp(0, Math.PI, p)
        // Natural X tilt during flip — feels physical
        cardRef.current.rotation.x = Math.sin(p * Math.PI) * -0.14 + 0.08
        // Slight Z twist during flip
        cardRef.current.rotation.z = Math.sin(p * Math.PI) * 0.06 - 0.005
      }

      // ── Phase 4: settle into hero position (2.5 → 3.0s)
      if (t >= 2.5 && t < 3.0) {
        const p = easeOut3(clamp((t-2.5)/0.5, 0, 1))
        // tiny position overshoot at p > 0.75
        const overshoot = p > 0.75
          ? Math.sin((p-0.75)*Math.PI/0.25) * 0.05 * (1.0-p)
          : 0
        cardRef.current.position.x = lerp(0, CARD_END_X, p)
        cardRef.current.position.y = lerp(0.35, CARD_END_Y + overshoot, p)
        cardRef.current.position.z = lerp(2.0, CARD_END_Z, p)
        // Tiny rotation overshoot
        const rotOver = p > 0.8 ? Math.sin((p-0.8)*Math.PI/0.2)*0.04*(1-p) : 0
        cardRef.current.rotation.y = lerp(Math.PI, Math.PI + 0.06 + rotOver, p)
        cardRef.current.rotation.x = lerp(-0.14+0.08, -0.05, p)
        cardRef.current.rotation.z = lerp(0, 0.0, p)
      }

      if (t >= 3.0) { done.current = true }
    }

    // ── After animation: float + mouse parallax
    if (done.current) {
      // Subtle hover float
      cardRef.current.position.y = CARD_END_Y + Math.sin(t * 0.75) * 0.038
      // Mouse parallax — 3-5 degrees (0.05–0.09 rad)
      const targetRotX = mouseY.current * -0.07 - 0.05
      const targetRotY = Math.PI + 0.06 + mouseX.current * 0.09
      cardRef.current.rotation.x += (targetRotX - cardRef.current.rotation.x) * 0.07
      cardRef.current.rotation.y += (targetRotY - cardRef.current.rotation.y) * 0.07
    }
  })

  if (!frontTex || !backTex || !slvTex) return null

  return (
    <>
      {/* ── Sleeve assembly — stays at hero X position always */}
      <group ref={sleeveRef} position={[CARD_END_X, SY, 0]}>
        {/* Back face */}
        <mesh position={[0, 0, -(CD/2 + 0.035)]} renderOrder={0}>
          <boxGeometry args={[CW+0.16, CH+0.12, 0.042]} />
          <meshStandardMaterial map={slvTex} roughness={0.92} metalness={0.0} color="#0D0D18" />
        </mesh>
        {/* Front face — renders OVER card when card is inside */}
        <mesh position={[0, 0, CD/2 + 0.035]} renderOrder={15}>
          <boxGeometry args={[CW+0.16, CH+0.12, 0.042]} />
          <meshStandardMaterial map={slvTex} roughness={0.92} metalness={0.0} color="#0D0D18" />
        </mesh>
        {/* Left wall */}
        <mesh position={[-(CW/2+0.08), 0, 0]}>
          <boxGeometry args={[0.042, CH+0.12, CD+0.07]} />
          <meshStandardMaterial color="#0A0A14" roughness={0.95} />
        </mesh>
        {/* Right wall */}
        <mesh position={[CW/2+0.08, 0, 0]}>
          <boxGeometry args={[0.042, CH+0.12, CD+0.07]} />
          <meshStandardMaterial color="#0A0A14" roughness={0.95} />
        </mesh>
        {/* Bottom wall */}
        <mesh position={[0, -(CH/2+0.06), 0]}>
          <boxGeometry args={[CW+0.20, 0.042, CD+0.07]} />
          <meshStandardMaterial color="#0A0A14" roughness={0.95} />
        </mesh>
      </group>

      {/* ── The Card */}
      <group ref={cardRef} position={[CARD_END_X, CARD_START_Y, 0]}>
        {/* Body */}
        <mesh renderOrder={5}>
          <boxGeometry args={[CW, CH, CD]} />
          <meshPhysicalMaterial
            color="#080810"
            roughness={0.32}
            metalness={0.07}
            clearcoat={0.45}
            clearcoatRoughness={0.18}
          />
        </mesh>
        {/* Front face texture */}
        <mesh position={[0, 0, CD/2+0.001]} renderOrder={6}>
          <planeGeometry args={[CW-0.008, CH-0.008]} />
          <meshStandardMaterial map={frontTex} roughness={0.32} metalness={0.06} />
        </mesh>
        {/* Back face texture */}
        <mesh position={[0, 0, -(CD/2+0.001)]} rotation={[0, Math.PI, 0]} renderOrder={6}>
          <planeGeometry args={[CW-0.008, CH-0.008]} />
          <meshStandardMaterial map={backTex} roughness={0.28} metalness={0.06} />
        </mesh>
        {/* Blue rim light edge — rendered from behind */}
        <mesh renderOrder={4}>
          <boxGeometry args={[CW+0.003, CH+0.003, CD+0.002]} />
          <meshBasicMaterial color="#1A2A6E" side={THREE.BackSide} />
        </mesh>
      </group>

      {/* Atmospheric glow behind card */}
      <mesh position={[CARD_END_X, 0, -0.8]} renderOrder={-1}>
        <planeGeometry args={[5.5, 4]} />
        <meshBasicMaterial color="#070F3A" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

/* ── Main exported scene ────────────────────────────────────── */
export default function CardScene({ prefersReduced }) {
  const mouseX = useRef(0)
  const mouseY = useRef(0)

  useEffect(() => {
    const onMove = (e) => {
      mouseX.current = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseY.current = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <Canvas
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.25,
      }}
      dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
      style={{ background: 'transparent' }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 6.2]} fov={44} near={0.1} far={50} />

      {/* Lighting — cinematic three-point + rim */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[2, 5, 3]}  intensity={0.85} color="#FFFFFF" />
      <directionalLight position={[-3, 1, 2]} intensity={0.28} color="#96BEFF" />
      {/* Blue rim from left-back */}
      <pointLight position={[-2.5, 0.5, -1.5]} intensity={3.5} color="#315CFF" distance={9} />
      {/* Warm subtle fill from below */}
      <pointLight position={[1, -3.5, 1.5]}   intensity={0.45} color="#FFE0B0" distance={7} />
      {/* Soft key from right */}
      <pointLight position={[4, 2, 2]}         intensity={0.5}  color="#FFFFFF" distance={10} />

      <CardAndSleeve mouseX={mouseX} mouseY={mouseY} prefersReduced={prefersReduced} />

      <ContactShadows
        position={[0, -2.4, 0]}
        opacity={0.5}
        scale={10}
        blur={3}
        far={5}
        color="#000510"
      />
    </Canvas>
  )
}
