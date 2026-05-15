import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Menu, Bell } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '서비스 관리 대시보드',
  description: '엑셀 연동 고객 관리 시스템',
}

import { DataProvider } from '@/lib/DataContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <DataProvider>
          <div className="container">
            <header className="header">
              <Menu size={24} />
              <h1>서비스 관리</h1>
              <Bell size={24} />
            </header>
            
            <main>
              {children}
            </main>

            <BottomNav />
          </div>
        </DataProvider>
      </body>
    </html>
  )
}

