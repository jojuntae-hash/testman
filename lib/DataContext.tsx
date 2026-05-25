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
  현장메모?: string
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
  folderColors: Record<string, string>
  updateFolderColor: (folderName: string, color: string) => void
  renameFolderColor: (oldName: string, newName: string, newColor?: string) => void
  completionModal?: {
    isOpen: boolean
    targetIds: string[]
    newStatus: string
    close: () => void
    confirm: (date: string) => Promise<void>
  }
  reservationModal?: {
    isOpen: boolean
    targetIds: string[]
    newStatus: string
    close: () => void
    confirm: (dateTime: string) => Promise<void>
  }
  restoreFromBackup: (backupData: CustomerData[]) => Promise<void>
  
  // SMS 기능
  smsQueue: { id: string; name: string; phone: string }[]
  setSmsQueue: React.Dispatch<React.SetStateAction<{ id: string; name: string; phone: string }[]>>
  addToSmsQueue: (name: string, phone: string) => void
  removeFromSmsQueue: (id: string) => void
  clearSmsQueue: () => void
  
  smsTemplates: { id: string; title: string; content: string }[]
  addSmsTemplate: (title: string, content: string) => void
  updateSmsTemplate: (id: string, title: string, content: string) => void
  deleteSmsTemplate: (id: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

import { initialCustomers } from './initialData'
import WorkCompletionModal from '@/components/WorkCompletionModal'
import ReservationModal from '@/components/ReservationModal'

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomersState] = useState<CustomerData[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [folderColors, setFolderColorsState] = useState<Record<string, string>>({})

  // SMS 관련 상태
  const [smsQueue, setSmsQueue] = useState<{ id: string; name: string; phone: string }[]>([])
  const [smsTemplates, setSmsTemplates] = useState<{ id: string; title: string; content: string }[]>([])

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

    // 2.5 Fetch memos if Supabase is configured
    let memoMap: Record<string, string> = {}
    if (isSupabaseConfigured) {
      try {
        const { data: memosData } = await supabase.from('memos').select('customer_id, content').eq('is_deleted', false)
        if (memosData) {
          memosData.forEach(m => {
            memoMap[m.customer_id] = m.content
          })
        }
      } catch (err) {
        console.error('Failed to query memos:', err)
      }
    }

    // 3. 연락처 보정 적용
    const fixed = loadedCustomers.map((c: any) => ({
      ...c,
      전화번호: fixPhoneNumber(c.전화번호),
      핸드폰번호: fixPhoneNumber(c.핸드폰번호),
      설치전화번호: fixPhoneNumber(c.설치전화번호),
      설치핸드폰번호: fixPhoneNumber(c.설치핸드폰번호),
      현장메모: memoMap[c.id] || c.현장메모 || ''
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

    // 6시간(21,600,000ms) 경과 시 자동 백업
    const now = Date.now()
    const lastBackupTime = parseInt(localStorage.getItem('lastBackupTime') || '0', 10)
    if (now - lastBackupTime >= 21600000 && fixed.length > 0) {
      import('./backupUtils').then(({ saveBackup }) => {
        saveBackup(fixed).then(() => {
          localStorage.setItem('lastBackupTime', now.toString())
          console.log('Auto backup created successfully.')
        }).catch(err => console.error('Auto backup failed', err))
      })
    }
  }

  // Load data on mount
  useEffect(() => {
    // Load folder colors
    const savedColors = localStorage.getItem('folderColors')
    if (savedColors) {
      try {
        setFolderColorsState(JSON.parse(savedColors))
      } catch (e) {
        console.error('Failed to parse folder colors', e)
      }
    }

    const fetchSmsQueue = async () => {
      const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('sms_queue').select('*').order('created_at', { ascending: true })
          if (data && data.length > 0) {
            setSmsQueue(data)
            localStorage.setItem('smsQueue', JSON.stringify(data))
          } else {
            const savedSmsQueue = localStorage.getItem('smsQueue')
            if (savedSmsQueue) {
              const parsed = JSON.parse(savedSmsQueue)
              setSmsQueue(parsed)
              if (parsed.length > 0) {
                await supabase.from('sms_queue').upsert(parsed)
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch SMS queue:', e)
        }
      } else {
        const savedSmsQueue = localStorage.getItem('smsQueue')
        if (savedSmsQueue) {
          try {
            setSmsQueue(JSON.parse(savedSmsQueue))
          } catch (e) {}
        }
      }
    }
    fetchSmsQueue()
    const fetchSmsTemplates = async () => {
      const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('sms_templates').select('*').order('created_at', { ascending: true })
          if (data && data.length > 0) {
            setSmsTemplates(data)
            localStorage.setItem('smsTemplates', JSON.stringify(data))
          } else {
            const savedSmsTemplates = localStorage.getItem('smsTemplates')
            if (savedSmsTemplates) {
              const parsed = JSON.parse(savedSmsTemplates)
              setSmsTemplates(parsed)
              if (parsed.length > 0) {
                await supabase.from('sms_templates').upsert(parsed)
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch SMS templates:', e)
        }
      } else {
        const savedSmsTemplates = localStorage.getItem('smsTemplates')
        if (savedSmsTemplates) {
          try {
            setSmsTemplates(JSON.parse(savedSmsTemplates))
          } catch (e) {}
        }
      }
    }
    fetchSmsTemplates()

    refreshData().then(() => {
      setIsInitialized(true)
    })
  }, [])

  const updateFolderColor = (folderName: string, color: string) => {
    setFolderColorsState(prev => {
      const updated = { ...prev, [folderName]: color }
      localStorage.setItem('folderColors', JSON.stringify(updated))
      return updated
    })
  }

  const renameFolderColor = (oldName: string, newName: string, newColor?: string) => {
    setFolderColorsState(prev => {
      const updated = { ...prev }
      const colorToSet = newColor || updated[oldName] || '#34495e'
      if (oldName !== newName) {
        delete updated[oldName]
      }
      updated[newName] = colorToSet
      localStorage.setItem('folderColors', JSON.stringify(updated))
      return updated
    })
  }

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

  // 백업 데이터로 완전 복원
  const restoreFromBackup = async (backupData: CustomerData[]) => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        // 기존 데이터 완전 삭제
        await supabase.from('customers').delete().neq('id', '')
      } catch (err) {
        console.error('Supabase clear before restore error:', err)
      }
    }
    // 백업 데이터로 교체 (setCustomers 내부에서 localStorage 갱신 및 Supabase upsert가 진행됨)
    await setCustomers(backupData)
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

  const [reservationModalState, setReservationModalState] = useState<{
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

  const closeReservationModal = () => {
    setReservationModalState({
      isOpen: false,
      targetIds: [],
      newStatus: ''
    })
  }

  // 실제 상태 변경 실행 함수
  const executeStatusChange = async (ids: string[], newStatus: string, completedDate?: string, reservedDate?: string) => {
    // React batching으로 인해 내부 updated 변수가 비어있는 상태로 DB 요청이 가는 것을 방지하기 위해 먼저 계산
    const updated = customers.map(c => {
      if (ids.includes(c.id)) {
        return {
          ...c,
          status: newStatus,
          작업완료일: newStatus === '작업완료' ? completedDate : undefined,
          예약일자: newStatus === '예약완료' ? (reservedDate || '') : (newStatus === '작업미완료' || newStatus === '삭제됨' || newStatus === '작업완료' ? '' : c.예약일자)
        }
      }
      return c
    })

    setCustomersState(updated)
    localStorage.setItem('customers', JSON.stringify(updated))

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
    if (newStatus === '예약완료' && !skipModal) {
      setReservationModalState({
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

  const confirmReservation = async (dateTime: string) => {
    await executeStatusChange(reservationModalState.targetIds, reservationModalState.newStatus, undefined, dateTime)
    closeReservationModal()
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

  // SMS 관리 함수
  const addToSmsQueue = async (name: string, phone: string) => {
    if (!phone) {
      alert('전화번호가 없습니다.')
      return
    }
    const exists = smsQueue.some(item => item.phone === phone)
    if (exists) return

    const newItem = { id: crypto.randomUUID(), name, phone }
    setSmsQueue(prev => {
      const isExist = prev.find(item => item.phone === phone)
      if (isExist) return prev
      const updated = [...prev, newItem]
      localStorage.setItem('smsQueue', JSON.stringify(updated))
      return updated
    })

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      await supabase.from('sms_queue').insert([newItem])
    }
  }

  const removeFromSmsQueue = async (id: string) => {
    setSmsQueue(prev => {
      const updated = prev.filter(item => item.id !== id)
      localStorage.setItem('smsQueue', JSON.stringify(updated))
      return updated
    })
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      await supabase.from('sms_queue').delete().eq('id', id)
    }
  }

  const clearSmsQueue = async () => {
    setSmsQueue([])
    localStorage.removeItem('smsQueue')
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      await supabase.from('sms_queue').delete().neq('id', '')
    }
  }

  const addSmsTemplate = async (title: string, content: string) => {
    const newItem = { id: crypto.randomUUID(), title, content }
    setSmsTemplates(prev => {
      const updated = [...prev, newItem]
      localStorage.setItem('smsTemplates', JSON.stringify(updated))
      return updated
    })
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      await supabase.from('sms_templates').insert([newItem])
    }
  }

  const updateSmsTemplate = async (id: string, title: string, content: string) => {
    setSmsTemplates(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, title, content } : t)
      localStorage.setItem('smsTemplates', JSON.stringify(updated))
      return updated
    })
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      await supabase.from('sms_templates').update({ title, content }).eq('id', id)
    }
  }

  const deleteSmsTemplate = async (id: string) => {
    setSmsTemplates(prev => {
      const updated = prev.filter(t => t.id !== id)
      localStorage.setItem('smsTemplates', JSON.stringify(updated))
      return updated
    })
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      await supabase.from('sms_templates').delete().eq('id', id)
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
      folderColors,
      updateFolderColor,
      renameFolderColor,
      completionModal: {
        isOpen: completionModalState.isOpen,
        targetIds: completionModalState.targetIds,
        newStatus: completionModalState.newStatus,
        close: closeCompletionModal,
        confirm: confirmCompletion
      },
      reservationModal: {
        isOpen: reservationModalState.isOpen,
        targetIds: reservationModalState.targetIds,
        newStatus: reservationModalState.newStatus,
        close: closeReservationModal,
        confirm: confirmReservation
      },
      restoreFromBackup,
      smsQueue,
      setSmsQueue,
      addToSmsQueue,
      removeFromSmsQueue,
      clearSmsQueue,
      smsTemplates,
      addSmsTemplate,
      updateSmsTemplate,
      deleteSmsTemplate
    }}>
      {children}
      <WorkCompletionModal />
      <ReservationModal />
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
