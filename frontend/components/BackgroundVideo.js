'use client'

import React, { useRef, useEffect, useState } from 'react'

const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_030111_a9e15665-d379-4a7f-8116-695bbe452ad1.mp4'

export default function BackgroundVideo() {
  const videoRef = useRef(null)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true
      videoRef.current.defaultMuted = true
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => setVideoLoaded(true))
          .catch(() => {
            // Mobile low-power mode / autoplay policy fallback
            setVideoLoaded(false)
          })
      }
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#04060C',
      }}
    >
      {/* Dynamic Ambient Mesh Glow for instant rich rendering and mobile fallback */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(ellipse 90% 70% at 50% 20%, rgba(49, 92, 255, 0.18) 0%, transparent 60%),
            radial-gradient(circle at 85% 85%, rgba(82, 132, 255, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 15% 75%, rgba(242, 183, 5, 0.08) 0%, transparent 45%)
          `,
          zIndex: 1,
        }}
      />

      {/* HTML5 Optimized Video Player */}
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        onCanPlay={() => setVideoLoaded(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.78) contrast(1.12)',
          zIndex: 2,
          opacity: videoLoaded ? 1 : 0.8,
          transition: 'opacity 0.6s ease',
        }}
      />

      {/* Global dark ambient overlay for sharp, legible text & data */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(4, 6, 12, 0.42) 0%, rgba(4, 6, 12, 0.84) 75%, #030408 100%)',
          zIndex: 3,
        }}
      />
    </div>
  )
}

