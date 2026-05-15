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
  status: '작업미완료' | '예약완료' | '작업완료'
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
}

interface DataContextType {
  customers: CustomerData[]
  setCustomers: (data: CustomerData[]) => void
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

import { initialCustomers } from './initialData'

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<CustomerData[]>(initialCustomers)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  return (
    <DataContext.Provider value={{ customers, setCustomers, selectedIds, setSelectedIds }}>
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
