import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import BottomNav from '@/components/BottomNav'
import { DataProvider } from '@/lib/DataContext'
import AuthWrapper from '@/components/AuthWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '서비스 관리 대시보드',
  description: '엑셀 연동 고객 관리 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <DataProvider>
          <AuthWrapper>
            <div className="container">
              <main>{children}</main>
              <BottomNav />
            </div>
          </AuthWrapper>
        </DataProvider>
      </body>
    </html>
  )
}
