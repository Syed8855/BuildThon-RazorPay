'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/playground', label: 'Batch & Sim' },
  { href: '/checkout-recovery', label: 'Checkout Recovery' },
  { href: '/receivables', label: 'B2B Receivables' },
  { href: '/analytics', label: 'Analytics' },
]

export default function GlobalNav() {
  const path = usePathname()
  const isHero = path === '/'
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav
        className="nav"
        style={
          isHero
            ? {
                position: 'fixed',
                background: 'rgba(3, 5, 9, 0.72)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottomColor: 'rgba(255, 255, 255, 0.08)',
                userSelect: 'none',
              }
            : { userSelect: 'none' }
        }
      >
        <Link href="/" className="nav__brand" style={{ textDecoration: 'none' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #315CFF 0%, #1736BD 100%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(49, 92, 255, 0.4)',
            }}
          >
            <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <span>
            Razorpay<em>Recovery</em>
          </span>
        </Link>

        {/* Desktop Links with Framer Motion Spring Pill */}
        <ul className="nav__links" style={{ position: 'relative' }}>
          {NAV_LINKS.map(({ href, label }) => {
            const active = !isHero && (path === href || (href !== '/' && path.startsWith(href)))
            return (
              <li key={href} style={{ position: 'relative' }}>
                <Link
                  href={href}
                  className={active ? 'active' : ''}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    color: active ? '#FFFFFF' : isHero ? 'var(--text-secondary)' : 'var(--text-muted)',
                    transition: 'color 160ms ease',
                  }}
                >
                  {label}
                </Link>
                {active && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(82, 132, 255, 0.14)',
                      border: '1px solid rgba(82, 132, 255, 0.32)',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 0 14px rgba(49, 92, 255, 0.2)',
                      zIndex: 1,
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </li>
            )
          })}
        </ul>

        <div className="nav__actions">
          {!isHero ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--accent-bright)',
                  background: 'rgba(82, 132, 255, 0.08)',
                  border: '1px solid rgba(82, 132, 255, 0.22)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '4px 10px',
                }}
                className="desktop-status-pill"
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5284FF', boxShadow: '0 0 8px #5284FF' }} />
                <span>Autonomous Engine 0.04s</span>
              </div>

              <Link
                href="/playground"
                className="btn btn-primary"
                style={{ fontSize: 13, height: 38, padding: '0 16px', gap: 6 }}
                aria-label="Launch Playground Simulator"
              >
                Simulator <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link
                href="/design-decisions"
                className="btn btn-secondary"
                style={{ fontSize: 12.5, height: 36, padding: '0 14px' }}
                aria-label="View System Architecture & Design Decisions"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Architecture
              </Link>
            </div>
          )}

          <button
            className="btn btn-icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: 'none' }}
            id="mobile-nav-toggle"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: 64,
              left: 0,
              right: 0,
              background: 'rgba(4, 6, 12, 0.98)',
              backdropFilter: 'blur(24px)',
              borderBottom: '1px solid var(--border)',
              padding: '24px',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              userSelect: 'none',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8)',
            }}
          >
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: path === href ? 'var(--accent-bright)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: path === href ? 'rgba(82, 132, 255, 0.1)' : 'transparent',
                }}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/playground"
              onClick={() => setMobileOpen(false)}
              className="btn btn-primary"
              style={{ marginTop: 8 }}
              aria-label="Launch Playground Simulator"
            >
              Launch Simulator →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
