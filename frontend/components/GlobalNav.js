'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/playground', label: 'Playground' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/design-decisions', label: 'Design decisions' },
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
                background: 'rgba(5,7,13,0.7)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottomColor: 'var(--border)',
              }
            : {}
        }
      >
        <Link href="/" className="nav__brand" style={{ textDecoration: 'none' }}>
          ⚡ Razorpay<em>Recovery</em>
        </Link>

        {/* Desktop Links */}
        <ul className="nav__links">
          {NAV_LINKS.map(({ href, label }) => {
            const active = path === href || (href !== '/' && path.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={active ? 'active' : ''}
                  style={isHero ? { color: active ? 'var(--accent)' : 'var(--text-secondary)' } : {}}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="nav__actions">
          <Link
            href="/playground"
            className="btn btn-primary"
            style={{ fontSize: 13, height: 38, padding: '0 18px', gap: 6 }}
          >
            Launch Playground <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            className="btn btn-icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: 'none' }}
            id="mobile-nav-toggle"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            left: 0,
            right: 0,
            background: 'rgba(5,7,13,0.96)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            padding: '24px',
            zIndex: 199,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: path === href ? 'var(--accent)' : 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '8px 0',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
