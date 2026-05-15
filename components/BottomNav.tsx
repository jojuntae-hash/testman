'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Map, Navigation, Settings } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <LayoutGrid size={22} />
        <span>리스트</span>
      </Link>
      <Link href="/map" className={`nav-item ${pathname === '/map' ? 'active' : ''}`}>
        <Map size={22} />
        <span>지도</span>
      </Link>
      <Link href="/route" className={`nav-item ${pathname === '/route' ? 'active' : ''}`}>
        <Navigation size={22} />
        <span>경로</span>
      </Link>
      <Link href="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
        <Settings size={22} />
        <span>설정</span>
      </Link>
    </nav>
  )
}
