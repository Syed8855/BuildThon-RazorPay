'use client'
// GlobalNav — renders on every page.
// Hero (/): transparent background, marketing links overlay.
// Inner pages: frosted dark, app links.
// Identical height, font, spacing, button styles on all routes.

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HERO_LINKS = [
  { href: '/dashboard',        label: 'Dashboard' },
  { href: '/transactions',     label: 'Transactions' },
  { href: '/playground',       label: 'Playground' },
  { href: '/analytics',        label: 'Analytics' },
  { href: '/design-decisions', label: 'Design decisions' },
]

export default function GlobalNav() {
  const path = usePathname()
  const isHero = path === '/'

  return (
    <nav className="nav" style={isHero ? {
      position: 'fixed',
      background: 'transparent',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      borderBottomColor: 'transparent',
    } : {}}>
      <Link href="/" className="nav__brand" style={{ textDecoration: 'none' }}>
        ⚡ Revenue<em>Recovery</em>
      </Link>

      <ul className="nav__links">
        {HERO_LINKS.map(({ href, label }) => {
          const active = path === href || (href !== '/' && path.startsWith(href))
          return (
            <li key={href}>
              <Link
                href={href}
                className={active ? 'active' : ''}
                style={isHero ? { color: active ? 'var(--accent)' : 'rgba(255,255,255,0.55)' } : {}}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="nav__actions">
        <button className="btn btn-ghost" style={isHero ? { color: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.12)' } : {}}>
          Log in
        </button>
        <Link href="/playground" className="btn btn-primary" style={{ fontSize: 14, height: 38, padding: '0 18px' }}>
          Get started →
        </Link>
      </div>
    </nav>
  )
}
