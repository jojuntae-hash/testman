'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'

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
  작업완료일?: string
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
  setCustomers: (data: CustomerData[]) => Promise<void>
  addCustomer: (data: CustomerData) => Promise<void>
  deleteCustomers: (ids: string[]) => Promise<void>
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  updateCustomerCoords: (id: string, lat: number, lng: number) => Promise<void>
  resetToDefault: () => void
  clearAllCustomers: () => void
  changeCustomerStatus: (ids: string[], newStatus: string, skipModal?: boolean) => Promise<void>
  refreshData: () => Promise<void>
  completionModal?: {
    isOpen: boolean
    targetIds: string[]
    newStatus: string
    close: () => void
    confirm: (date: string) => Promise<void>
  }
}

const DataContext = createContext<DataContextType | undefined>(undefined)

import { initialCustomers } from './initialData'
import WorkCompletionModal from '@/components/WorkCompletionModal'

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

  // Supabase 및 로컬 스토리지로부터 데이터를 가져오는 동기화 로직
  const refreshData = async () => {
    let loadedCustomers: CustomerData[] = []
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 1. Supabase 연동 시도
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
        if (!error && data && data.length > 0) {
          loadedCustomers = data as CustomerData[]
        } else if (error) {
          console.error('Supabase load error:', error)
        }
      } catch (err) {
        console.error('Failed to query Supabase:', err)
      }
    }

    // 2. Supabase에 데이터가 없거나 비활성화 시 로컬 스토리지 사용
    if (loadedCustomers.length === 0) {
      const savedCustomers = localStorage.getItem('customers')
      if (savedCustomers) {
        try {
          loadedCustomers = JSON.parse(savedCustomers)
        } catch (e) {
          loadedCustomers = initialCustomers
        }
      } else {
        loadedCustomers = initialCustomers
      }
    }

    // 3. 연락처 보정 적용
    const fixed = loadedCustomers.map((c: any) => ({
      ...c,
      전화번호: fixPhoneNumber(c.전화번호),
      핸드폰번호: fixPhoneNumber(c.핸드폰번호),
      설치전화번호: fixPhoneNumber(c.설치전화번호),
      설치핸드폰번호: fixPhoneNumber(c.설치핸드폰번호)
    }))

    setCustomersState(fixed)
    localStorage.setItem('customers', JSON.stringify(fixed))

    // Supabase가 설정되어 있고 원격 데이터가 비어있었다면 초기 로컬 데이터를 업로드
    if (isSupabaseConfigured && loadedCustomers.length === 0) {
      try {
        await supabase.from('customers').upsert(fixed)
      } catch (err) {
        console.error('Failed to sync initial data to Supabase:', err)
      }
    }
  }

  // Load data on mount
  useEffect(() => {
    refreshData().then(() => {
      setIsInitialized(true)
    })
  }, [])

  // Save to localStorage and Supabase whenever customers change
  const setCustomers = async (data: CustomerData[]) => {
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

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        // 기존 원격 데이터를 upsert를 통해 동기화
        const { error } = await supabase.from('customers').upsert(fixedData)
        if (error) {
          console.error('Supabase upsert error:', error)
        }
      } catch (err) {
        console.error('Supabase sync error:', err)
      }
    }
  }

  // 단일 고객 추가 및 동기화
  const addCustomer = async (newCustomer: CustomerData) => {
    const fixedCustomer = {
      ...newCustomer,
      전화번호: fixPhoneNumber(newCustomer.전화번호),
      핸드폰번호: fixPhoneNumber(newCustomer.핸드폰번호),
      설치전화번호: fixPhoneNumber(newCustomer.설치전화번호),
      설치핸드폰번호: fixPhoneNumber(newCustomer.설치핸드폰번호)
    }

    setCustomersState(prev => {
      const updated = [...prev, fixedCustomer]
      localStorage.setItem('customers', JSON.stringify(updated))
      return updated
    })

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('customers').insert([fixedCustomer])
        if (error) {
          console.error('Supabase insert error:', error)
          alert(`서버 저장 실패: ${error.message || JSON.stringify(error)}`)
        }
      } catch (err) {
        console.error('Supabase sync error:', err)
      }
    }
  }

  // 고객 다중 삭제 로직
  const deleteCustomers = async (ids: string[]) => {
    setCustomersState(prev => {
      const updated = prev.filter(c => !ids.includes(c.id))
      localStorage.setItem('customers', JSON.stringify(updated))
      return updated
    })

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('customers').delete().in('id', ids)
        if (error) {
          console.error('Supabase delete error:', error)
          alert(`서버 삭제 실패: ${error.message || JSON.stringify(error)}`)
        }
      } catch (err) {
        console.error('Supabase delete sync error:', err)
      }
    }
  }

  // 좌표 업데이트 함수 및 동기화
  const updateCustomerCoords = async (id: string, lat: number, lng: number) => {
    let updated: CustomerData[] = []
    setCustomersState(prev => {
      updated = prev.map(c => c.id === id ? { ...c, lat, lng } : c)
      localStorage.setItem('customers', JSON.stringify(updated))
      return updated
    })

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const target = updated.find(c => c.id === id)
        if (target) {
          await supabase.from('customers').upsert([target])
        }
      } catch (err) {
        console.error('Supabase coords sync error:', err)
      }
    }
  }

  // 샘플 데이터로 리셋 및 동기화
  const resetToDefault = async () => {
    const initialFixed = initialCustomers.map((c: any) => ({
      ...c,
      전화번호: fixPhoneNumber(c.전화번호),
      핸드폰번호: fixPhoneNumber(c.핸드폰번호),
      설치전화번호: fixPhoneNumber(c.설치전화번호),
      설치핸드폰번호: fixPhoneNumber(c.설치핸드폰번호)
    }))

    // Supabase 테이블 데이터 전체 삭제 후 초기 데이터 삽입
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        await supabase.from('customers').delete().neq('id', '')
      } catch (err) {
        console.error('Supabase clear before reset error:', err)
      }
    }

    await setCustomers(initialFixed)
  }

  const [completionModalState, setCompletionModalState] = useState<{
    isOpen: boolean
    targetIds: string[]
    newStatus: string
  }>({
    isOpen: false,
    targetIds: [],
    newStatus: ''
  })

  const closeCompletionModal = () => {
    setCompletionModalState({
      isOpen: false,
      targetIds: [],
      newStatus: ''
    })
  }

  // 실제 상태 변경 실행 함수
  const executeStatusChange = async (ids: string[], newStatus: string, completedDate?: string) => {
    let updated: CustomerData[] = []
    setCustomersState(prev => {
      updated = prev.map(c => {
        if (ids.includes(c.id)) {
          return {
            ...c,
            status: newStatus,
            작업완료일: newStatus === '작업완료' ? completedDate : undefined
          }
        }
        return c
      })
      localStorage.setItem('customers', JSON.stringify(updated))
      return updated
    })

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const targets = updated.filter(c => ids.includes(c.id))
        if (targets.length > 0) {
          const { error } = await supabase.from('customers').upsert(targets)
          if (error) {
            console.error('Supabase status change sync error:', error)
          }
        }
      } catch (err) {
        console.error('Supabase status change sync error:', err)
      }
    }
  }

  // 상태 변경 및 동기화 함수
  const changeCustomerStatus = async (ids: string[], newStatus: string, skipModal?: boolean) => {
    if (newStatus === '작업완료' && !skipModal) {
      setCompletionModalState({
        isOpen: true,
        targetIds: ids,
        newStatus
      })
      return
    }
    const date = newStatus === '작업완료' ? new Date().toLocaleDateString('sv-SE') : undefined
    await executeStatusChange(ids, newStatus, date)
  }

  const confirmCompletion = async (date: string) => {
    await executeStatusChange(completionModalState.targetIds, completionModalState.newStatus, date)
    closeCompletionModal()
  }

  // 모든 데이터 삭제 및 동기화
  const clearAllCustomers = async () => {
    setCustomersState([])
    localStorage.removeItem('customers')

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        await supabase.from('customers').delete().neq('id', '')
      } catch (err) {
        console.error('Supabase delete all error:', err)
      }
    }
  }

  // Prevent hydration mismatch by not rendering children until initialized
  if (!isInitialized) return null

  return (
    <DataContext.Provider value={{ 
      customers, 
      setCustomers, 
      addCustomer,
      deleteCustomers,
      selectedIds, 
      setSelectedIds, 
      updateCustomerCoords, 
      resetToDefault, 
      clearAllCustomers,
      changeCustomerStatus,
      refreshData,
      completionModal: {
        isOpen: completionModalState.isOpen,
        targetIds: completionModalState.targetIds,
        newStatus: completionModalState.newStatus,
        close: closeCompletionModal,
        confirm: confirmCompletion
      }
    }}>
      {children}
      <WorkCompletionModal />
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
