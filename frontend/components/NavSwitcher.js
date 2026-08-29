'use client'
// NavSwitcher — renders nothing on hero route (/) so the hero page
// can embed its own full-bleed premium navigation.
// All other routes get the standard inner nav.

import { usePathname } from 'next/navigation'
import Nav from './Nav'

export default function NavSwitcher() {
  const path = usePathname()
  if (path === '/') return null
  return <Nav />
}
