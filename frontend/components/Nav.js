'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/',              label: 'Dashboard' },
  { href: '/transactions',  label: 'Transactions' },
  { href: '/playground',    label: 'Playground' },
  { href: '/analytics',     label: 'Analytics' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="topnav">
      <div className="topnav__brand">
        ⚡ Revenue<span>Recovery</span>
      </div>
      <ul className="topnav__links">
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
