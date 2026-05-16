'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface CustomerData {
  id: string
  // 01. 일반사항
  고객번호: string
  모델명: string
  계약일자: string
  계약만료일자: string
  최종점검일: string
  예약일자: string
  당월작업: string
  최종작업내용: string
  status: string // '작업미완료' | '예약완료' | '작업완료' | '삭제됨' 및 사용자 정의 폴더명
  // 02. 계약정보
  계약자구분: string
  고객명_상호: string
  사업자번호: string
  전화번호: string
  핸드폰번호: string
  주소: string
  // 03. 설치정보
  설치처구분: string
  설치자명: string
  설치구분: string
  설치전화번호: string
  설치핸드폰번호: string
  설치주소: string
  설치시특이사항: string
  lat?: number
  lng?: number
}

interface DataContextType {
  customers: CustomerData[]
  setCustomers: (data: CustomerData[]) => void
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  updateCustomerCoords: (id: string, lat: number, lng: number) => void
  resetToDefault: () => void
  clearAllCustomers: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

import { initialCustomers } from './initialData'

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomersState] = useState<CustomerData[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // 전화번호 보정 로직 (10으로 시작하면 0 추가)
  const fixPhoneNumber = (phone: string) => {
    if (!phone) return ''
    const s = phone.toString().trim()
    // 숫자만 추출
    const clean = s.replace(/[^0-9]/g, '')
    // 10으로 시작하고 총 길이가 9~10자리인 경우 (010인데 0이 빠진 경우)
    if (clean.startsWith('10') && (clean.length === 9 || clean.length === 10)) {
      return '0' + clean
    }
    return s
  }

  // Load from localStorage on mount
  useEffect(() => {
    const savedCustomers = localStorage.getItem('customers')
    if (savedCustomers) {
      try {
        const parsed = JSON.parse(savedCustomers)
        // 로드할 때 모든 연락처 필드 보정
        const fixed = parsed.map((c: any) => ({
          ...c,
          전화번호: fixPhoneNumber(c.전화번호),
          핸드폰번호: fixPhoneNumber(c.핸드폰번호),
          설치전화번호: fixPhoneNumber(c.설치전화번호),
          설치핸드폰번호: fixPhoneNumber(c.설치핸드폰번호)
        }))
        setCustomersState(fixed)
        // 보정된 데이터를 다시 저장하여 영구 반영
        localStorage.setItem('customers', JSON.stringify(fixed))
      } catch (e) {
        setCustomersState(initialCustomers)
      }
    } else {
      const initialFixed = initialCustomers.map((c: any) => ({
        ...c,
        전화번호: fixPhoneNumber(c.전화번호),
        핸드폰번호: fixPhoneNumber(c.핸드폰번호),
        설치전화번호: fixPhoneNumber(c.설치전화번호),
        설치핸드폰번호: fixPhoneNumber(c.설치핸드폰번호)
      }))
      setCustomersState(initialFixed)
    }
    setIsInitialized(true)
  }, [])

  // Save to localStorage whenever customers change
  const setCustomers = (data: CustomerData[]) => {
    // 저장 전에도 보정 적용
    const fixedData = data.map(c => ({
      ...c,
      전화번호: fixPhoneNumber(c.전화번호),
      핸드폰번호: fixPhoneNumber(c.핸드폰번호),
      설치전화번호: fixPhoneNumber(c.설치전화번호),
      설치핸드폰번호: fixPhoneNumber(c.설치핸드폰번호)
    }))
    setCustomersState(fixedData)
    localStorage.setItem('customers', JSON.stringify(fixedData))
  }

  // 좌표 업데이트 함수
  const updateCustomerCoords = (id: string, lat: number, lng: number) => {
    setCustomersState(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, lat, lng } : c)
      localStorage.setItem('customers', JSON.stringify(updated))
      return updated
    })
  }

  // 샘플 데이터로 리셋
  const resetToDefault = () => {
    const initialFixed = initialCustomers.map((c: any) => ({
      ...c,
      전화번호: fixPhoneNumber(c.전화번호),
      핸드폰번호: fixPhoneNumber(c.핸드폰번호),
      설치전화번호: fixPhoneNumber(c.설치전화번호),
      설치핸드폰번호: fixPhoneNumber(c.설치핸드폰번호)
    }))
    setCustomers(initialFixed)
  }

  // 모든 데이터 삭제
  const clearAllCustomers = () => {
    setCustomers([])
  }

  // Prevent hydration mismatch by not rendering children until initialized
  if (!isInitialized) return null

  return (
    <DataContext.Provider value={{ 
      customers, 
      setCustomers, 
      selectedIds, 
      setSelectedIds, 
      updateCustomerCoords, 
      resetToDefault, 
      clearAllCustomers 
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
