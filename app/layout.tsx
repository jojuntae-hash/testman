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
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Script
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_APP_KEY || 'bcf159529047078b426216b892689408'}&libraries=services&autoload=false`}
          strategy="beforeInteractive"
        />
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

