'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard',        label: 'Dashboard' },
  { href: '/transactions',     label: 'Transactions' },
  { href: '/playground',       label: 'Playground' },
  { href: '/analytics',        label: 'Analytics' },
  { href: '/design-decisions', label: 'Design decisions' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="inner-nav">
      <Link href="/" className="inner-nav__brand" style={{ textDecoration: 'none' }}>
        ⚡ Revenue<span style={{ color: 'var(--accent)' }}>Recovery</span>
      </Link>
      <ul className="inner-nav__links">
        {LINKS.map(({ href, label }) => {
          const active = path === href || (href !== '/' && path.startsWith(href))
          return (
            <li key={href}>
              <Link href={href} className={active ? 'active' : ''} style={{ textDecoration: 'none' }}>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
      <Link href="/" style={{
        fontSize: 13, fontWeight: 500,
        color: 'var(--text-dim)',
        padding: '6px 12px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        transition: 'color 200ms, border-color 200ms',
        flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.color='var(--text-primary)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.18)' }}
      onMouseLeave={e => { e.currentTarget.style.color='var(--text-dim)'; e.currentTarget.style.borderColor='var(--border)' }}
      >
        ← Home
      </Link>
    </nav>
  )
}
