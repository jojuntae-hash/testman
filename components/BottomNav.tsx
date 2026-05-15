'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, Folder, Map } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <ClipboardList size={24} />
        <span>리스트</span>
      </Link>
      <Link href="/status" className={`nav-item ${pathname === '/status' ? 'active' : ''}`}>
        <Folder size={24} />
        <span>현황</span>
      </Link>
      <Link href="/map" className={`nav-item ${pathname === '/map' ? 'active' : ''}`}>
        <Map size={24} />
        <span>지도</span>
      </Link>
    </nav>
  )
}
