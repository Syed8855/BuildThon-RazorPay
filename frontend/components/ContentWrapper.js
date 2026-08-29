'use client'
// ContentWrapper — applies main-content padding only for inner pages.
// Hero page (/) is full-bleed, handles its own layout.

import { usePathname } from 'next/navigation'

export default function ContentWrapper({ children }) {
  const path = usePathname()
  if (path === '/') return <>{children}</>
  return <main className="main-content">{children}</main>
}
