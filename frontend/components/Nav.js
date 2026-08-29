'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/',                  label: 'Home' },
  { href: '/dashboard',         label: 'Dashboard' },
  { href: '/transactions',      label: 'Transactions' },
  { href: '/playground',        label: 'Playground' },
  { href: '/analytics',         label: 'Analytics' },
  { href: '/design-decisions',  label: 'Design decisions' },
];

export default function Nav() {
  const path = usePathname();

  // Hero page: transparent nav over deep blue bg
  const isHero = path === '/';

  return (
    <nav className="topnav" style={isHero ? {
      background: 'rgba(7,38,84,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottomColor: 'rgba(255,255,255,0.10)',
    } : {}}>
      <Link href="/" className="topnav__brand" style={isHero ? { color: '#fff', textDecoration: 'none' } : {}}>
        ⚡ Revenue<span>Recovery</span>
      </Link>
      <ul className="topnav__links">
        {LINKS.map(({ href, label }) => {
          const active = href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
          return (
            <li key={href}>
              <Link
                href={href}
                className={active ? 'active' : ''}
                style={isHero ? { color: active ? '#4DA6FF' : 'rgba(255,255,255,0.65)' } : {}}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
