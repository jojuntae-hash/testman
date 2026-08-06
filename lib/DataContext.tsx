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
  created_at?: string
  약정?: string
  가입유형?: string
  월렌탈료?: string
  생년월일?: string
  이름?: string
}

export interface LongTermCustomer {
  id: string
  이름: string
  고객번호: string
  모델명: string
  계약일자: string
  계약만료일?: string
  작업완료일: string
  최종작업내용?: string
  계약자구분: string
  고객명_상호: string
  전화번호: string
  핸드폰번호: string
  주소: string
  설치자명: string
  설치전화번호?: string
  설치주소: string
  기록: string
  status?: string // 폴더 관리용 상태 ('미분류' 등)
  lat?: number
  lng?: number
  created_at?: string
  updated_at?: string
}

export interface SubscribedCustomer {
  id: string
  고객번호: string
  모델명: string
  계약일자: string
  계약만료일자: string
  예약일자: string
  당월작업: string
  최종작업내용: string
  status: string // 폴더 관리용 상태 ('미분류' 등)
  계약자구분: string
  고객명_상호: string
  사업자번호: string
  전화번호: string
  핸드폰번호: string
  주소: string
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
  created_at?: string
  updated_at?: string
  약정?: string
  가입유형?: string
  월렌탈료?: string
  생년월일?: string
  이름?: string
}
interface DataContextType {
  customers: CustomerData[]
  setCustomers: (data: CustomerData[]) => Promise<void>
  addCustomer: (data: CustomerData) => Promise<void>
  deleteCustomers: (ids: string[]) => Promise<void>
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  updateCustomer: (id: string, updates: Partial<CustomerData>) => Promise<void>
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

  // 장기 고객 관리
  longTermCustomers: LongTermCustomer[]
  setLongTermCustomers: (data: LongTermCustomer[]) => Promise<void>
  copyToLongTerm: (customerIds: string[]) => Promise<void>
  updateLongTermCustomer: (id: string, updates: Partial<LongTermCustomer>) => Promise<void>
  addLongTermCustomer: (customer: LongTermCustomer) => Promise<void>
  changeLongTermCustomerStatus: (ids: string[], newStatus: string) => Promise<void>
  updateLongTermCustomerCoords: (id: string, lat: number, lng: number) => Promise<void>
  deleteLongTermCustomers: (ids: string[]) => Promise<void>
  restoreLongTermFromBackup: (backupData: LongTermCustomer[]) => Promise<void>
  clearAllLongTermCustomers: () => Promise<void>
  
  // 가입고객 상태 및 함수
  subscribedCustomers: SubscribedCustomer[]
  setSubscribedCustomers: (data: SubscribedCustomer[]) => Promise<void>
  updateSubscribedCustomer: (id: string, updates: Partial<SubscribedCustomer>) => Promise<void>
  addSubscribedCustomer: (customer: SubscribedCustomer) => Promise<void>
  changeSubscribedCustomerStatus: (ids: string[], newStatus: string) => Promise<void>
  deleteSubscribedCustomers: (ids: string[]) => Promise<void>
  copyToSubscribed: (customerIds: string[]) => Promise<void>
  copyLongTermToSubscribed: (longTermIds: string[]) => Promise<void>
  clearAllSubscribedCustomers: () => Promise<void>
  restoreSubscribedFromBackup: (backupData: SubscribedCustomer[]) => Promise<void>
  syncMemosWithManagement: () => Promise<{ successCount: number; failedCount: number }>
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

  // 장기 고객 관리 상태
  const [longTermCustomers, setLongTermCustomersState] = useState<LongTermCustomer[]>([])
  const [subscribedCustomers, setSubscribedCustomersState] = useState<SubscribedCustomer[]>([])

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

  // UUID 변환 함수 (Supabase UUID 타입 호환을 위함)
  const toUUID = (id: string): string => {
    if (!id) return '00000000-0000-0000-0000-000000000000';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id.toLowerCase();
    }
    let hex = '';
    for(let i = 0; i < id.length; i++) {
      hex += id.charCodeAt(i).toString(16).padStart(2, '0');
    }
    hex = hex.padEnd(32, '0').slice(0, 32);
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
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

    // 장기 고객 관리 데이터 로드
    let loadedLongTerm: LongTermCustomer[] = []
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('long_term_customers').select('*')
        if (!error && data) {
          loadedLongTerm = data as LongTermCustomer[]
        }
      } catch (err) {
        console.error('Failed to query long_term_customers:', err)
      }
    }
    if (loadedLongTerm.length === 0) {
      const savedLongTerm = localStorage.getItem('longTermCustomers')
      if (savedLongTerm) {
        try { 
          const parsed = JSON.parse(savedLongTerm)
          loadedLongTerm = parsed.map((c: any) => ({ ...c, id: toUUID(c.id) }))
        } catch (e) {}
      }
      
      if (isSupabaseConfigured && loadedLongTerm.length > 0) {
        try {
          await supabase.from('long_term_customers').upsert(loadedLongTerm)
        } catch (err) {
          console.error('Failed to sync initial long term data to Supabase:', err)
        }
      }
    }
    setLongTermCustomersState(loadedLongTerm)

    // 가입고객 로드 (Supabase or LocalStorage)
    let loadedSubscribed: SubscribedCustomer[] = []
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('subscribed_customers').select('*').order('created_at', { ascending: false })
        if (error) throw error
        if (data) {
          loadedSubscribed = data as SubscribedCustomer[]
        }
      } catch (err) {
        console.error('Subscribed Supabase load error:', err)
      }
    } else {
      const stored = localStorage.getItem('subscribedCustomers')
      if (stored) {
        try {
          loadedSubscribed = JSON.parse(stored)
        } catch (e) {
          console.error(e)
        }
      }
    }
    setSubscribedCustomersState(loadedSubscribed)
    localStorage.setItem('longTermCustomers', JSON.stringify(loadedLongTerm))

    // 2.5 Fetch memos if Supabase is configured
    let memoMap: Record<string, string> = {}
    if (isSupabaseConfigured) {
      try {
        const { data: memosData } = await supabase.from('memos').select('customer_id, content').eq('is_deleted', false)
        if (memosData) {
          memosData.forEach((m: any) => {
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

    // Supabase에 저장할 때는 UI 전용 필드(현장메모 등)를 제외합니다.
    const sanitizeForDb = (data: any[]) => data.map(({ 현장메모, ...rest }) => rest)

    // Supabase가 설정되어 있고 원격 데이터가 비어있었다면 초기 로컬 데이터를 업로드
    if (isSupabaseConfigured && loadedCustomers.length === 0) {
      try {
        await supabase.from('customers').upsert(sanitizeForDb(fixed))
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

    // 장기 고객은 2주(14일 = 1,209,600,000ms) 경과 시 자동 백업
    const lastLongTermBackupTime = parseInt(localStorage.getItem('lastLongTermBackupTime') || '0', 10)
    if (now - lastLongTermBackupTime >= 1209600000 && loadedLongTerm.length > 0) {
      import('./backupUtils').then(({ saveLongTermBackup }) => {
        saveLongTermBackup(loadedLongTerm).then(() => {
          localStorage.setItem('lastLongTermBackupTime', now.toString())
          console.log('Long term auto backup created successfully.')
        }).catch(err => console.error('Long term auto backup failed', err))
      })
    }

    // 가입 고객은 1주일(7일 = 604,800,000ms) 경과 시 자동 백업
    const lastSubscribedBackupTime = parseInt(localStorage.getItem('lastSubscribedBackupTime') || '0', 10)
    if (now - lastSubscribedBackupTime >= 604800000 && loadedSubscribed.length > 0) {
      import('./backupUtils').then(({ saveSubscribedBackup }) => {
        saveSubscribedBackup(loadedSubscribed).then(() => {
          localStorage.setItem('lastSubscribedBackupTime', now.toString())
          console.log('Subscribed auto backup created successfully.')
        }).catch(err => console.error('Subscribed auto backup failed', err))
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

    refreshData()
    setIsInitialized(true)

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured && supabase.channel) {
      const channel = supabase.channel('realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          refreshData()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'long_term_customers' }, () => {
          refreshData()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memos' }, () => {
          refreshData()
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visit_logs' }, () => {
          refreshData()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
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
      설치핸드폰번호: fixPhoneNumber(c.설치핸드폰번호),
      created_at: c.created_at || new Date().toISOString()
    }))
    
    setCustomersState(fixedData)
    localStorage.setItem('customers', JSON.stringify(fixedData))

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        // 기존 원격 데이터를 upsert를 통해 동기화
        const sanitizeForDb = (arr: any[]) => arr.map(({ 현장메모, ...rest }) => rest)
        const { error } = await supabase.from('customers').upsert(sanitizeForDb(fixedData))
        if (error) {
          console.error('Supabase upsert error:', error)
          alert('저장 실패: ' + (error.message || JSON.stringify(error)))
        }
      } catch (err) {
        console.error('Supabase sync error:', err)
      }
    }
  }

  const addCustomer = async (newCustomer: CustomerData) => {
    const fixedCustomer = {
      ...newCustomer,
      전화번호: fixPhoneNumber(newCustomer.전화번호),
      핸드폰번호: fixPhoneNumber(newCustomer.핸드폰번호),
      설치전화번호: fixPhoneNumber(newCustomer.설치전화번호),
      설치핸드폰번호: fixPhoneNumber(newCustomer.설치핸드폰번호),
      created_at: newCustomer.created_at || new Date().toISOString()
    }

    setCustomersState(prev => {
      const updated = [...prev, fixedCustomer]
      localStorage.setItem('customers', JSON.stringify(updated))
      return updated
    })

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const { 현장메모, ...dbCustomer } = fixedCustomer
        const { error } = await supabase.from('customers').insert([dbCustomer])
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

  // 고객 정보 업데이트 함수
  const updateCustomer = async (id: string, updates: Partial<CustomerData>) => {
    let updated: CustomerData[] = []
    setCustomersState(prev => {
      updated = prev.map(c => c.id === id ? { ...c, ...updates } : c)
      localStorage.setItem('customers', JSON.stringify(updated))
      return updated
    })

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const target = updated.find(c => c.id === id)
        if (target) {
          const { 현장메모, ...dbTarget } = target
          await supabase.from('customers').upsert([dbTarget])
        }
      } catch (err) {
        console.error('Supabase customer update error:', err)
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
          const { 현장메모, ...dbTarget } = target
          await supabase.from('customers').upsert([dbTarget])
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
          예약일자: reservedDate !== undefined ? reservedDate : (newStatus === '삭제됨' ? '' : c.예약일자)
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
          const dbTargets = targets.map(({ 현장메모, ...rest }) => rest)
          const { error } = await supabase.from('customers').upsert(dbTargets)
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

  // 장기 고객관리 로직
  const setLongTermCustomers = async (data: LongTermCustomer[]) => {
    setLongTermCustomersState(data)
    localStorage.setItem('longTermCustomers', JSON.stringify(data))

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('long_term_customers').upsert(data)
        if (error) {
          console.error('Supabase long term upsert error:', error)
        }
      } catch (err) {
        console.error('Supabase long term sync error:', err)
      }
    }
  }

  const copyToLongTerm = async (customerIds: string[]) => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const targets = customers.filter(c => customerIds.includes(c.id))
    if (targets.length === 0) return

    const newLongTerms: LongTermCustomer[] = []
    const updatedLongTerms: LongTermCustomer[] = []
    const currentList = [...longTermCustomers]

    for (const c of targets) {
      const ltId = toUUID(c.id)
      
      // 중복 방지 및 업데이트 로직: ID가 같거나, 이름과 고객번호가 모두 같은 경우 중복으로 처리
      const existingIndex = currentList.findIndex(lt => 
        lt.id === ltId || 
        (lt.이름 === (c.고객명_상호 || '') && lt.고객번호 === (c.고객번호 || ''))
      )

      // 기록 병합 (현장메모 + 방문기록)
      let combinedRecord = ''
      if (c.현장메모) {
        combinedRecord += `[현장메모]\n${c.현장메모}\n\n`
      }

      if (isSupabaseConfigured) {
        try {
          const { data: logsData } = await supabase
            .from('visit_logs')
            .select('visit_date, content')
            .eq('customer_id', c.id)
            .eq('is_deleted', false)
            .order('visit_date', { ascending: false })
          
          if (logsData && logsData.length > 0) {
            combinedRecord += `[이전 방문 기록]\n`
            logsData.forEach((log: any) => {
              combinedRecord += `- ${log.visit_date}: ${log.content}\n`
            })
          }
        } catch (e) {
          console.error('Failed to fetch visit logs for long term copy', e)
        }
      }

      combinedRecord = combinedRecord.trim()

      if (existingIndex >= 0) {
        const existing = currentList[existingIndex]
        const updatedLT = { ...existing }
        let hasChanges = false

        if (c.작업완료일 && updatedLT.작업완료일 !== c.작업완료일) { updatedLT.작업완료일 = c.작업완료일; hasChanges = true }
        if (c.계약만료일자 && updatedLT.계약만료일 !== c.계약만료일자) { updatedLT.계약만료일 = c.계약만료일자; hasChanges = true }
        if (c.당월작업 && updatedLT.최종작업내용 !== c.당월작업) { updatedLT.최종작업내용 = c.당월작업; hasChanges = true }
        if (c.전화번호 && updatedLT.전화번호 !== c.전화번호) { updatedLT.전화번호 = c.전화번호; hasChanges = true }
        if (c.핸드폰번호 && updatedLT.핸드폰번호 !== c.핸드폰번호) { updatedLT.핸드폰번호 = c.핸드폰번호; hasChanges = true }
        if (c.주소 && updatedLT.주소 !== c.주소) { updatedLT.주소 = c.주소; hasChanges = true }
        if (c.설치전화번호 && updatedLT.설치전화번호 !== c.설치전화번호) { updatedLT.설치전화번호 = c.설치전화번호; hasChanges = true }
        if (c.설치주소 && updatedLT.설치주소 !== c.설치주소) { updatedLT.설치주소 = c.설치주소; hasChanges = true }
        
        if (combinedRecord) {
          const oldRecord = updatedLT.기록 || ''
          if (!oldRecord.includes(combinedRecord)) {
            updatedLT.기록 = oldRecord ? `${oldRecord}\n\n[${new Date().toISOString().split('T')[0]} 업데이트]\n${combinedRecord}` : combinedRecord
            hasChanges = true
          }
        }

        if (hasChanges) {
          currentList[existingIndex] = updatedLT
          updatedLongTerms.push(updatedLT)
        }
      } else {
        const newLT: LongTermCustomer = {
          id: ltId,
          이름: c.고객명_상호 || '',
          고객번호: c.고객번호 || '',
          모델명: c.모델명 || '',
          계약일자: c.계약일자 || '',
          계약만료일: c.계약만료일자 || '',
          작업완료일: c.작업완료일 || '',
          최종작업내용: c.당월작업 || '',
          계약자구분: c.계약자구분 || '',
          고객명_상호: c.고객명_상호 || '',
          전화번호: c.전화번호 || '',
          핸드폰번호: c.핸드폰번호 || '',
          주소: c.주소 || '',
          설치자명: c.설치자명 || '',
          설치전화번호: c.설치전화번호 || '',
          설치주소: c.설치주소 || '',
          기록: combinedRecord,
          created_at: new Date().toISOString()
        }
        newLongTerms.push(newLT)
        currentList.push(newLT)
      }
    }

    if (newLongTerms.length === 0 && updatedLongTerms.length === 0) {
      alert('업데이트되거나 새로 장기고객으로 복사될 데이터가 없습니다.')
      return
    }

    setLongTermCustomersState(currentList)
    localStorage.setItem('longTermCustomers', JSON.stringify(currentList))

    if (isSupabaseConfigured) {
      try {
        const upsertData = [...newLongTerms, ...updatedLongTerms]
        const { error } = await supabase.from('long_term_customers').upsert(upsertData)
        if (error) {
          console.error('Supabase long term upsert error:', error)
          alert(`서버 저장 실패: ${error.message || JSON.stringify(error)}`)
        }
      } catch (e) {
        console.error('Supabase long term upsert error:', e)
      }
    }
    
    let msg = ''
    if (newLongTerms.length > 0) msg += `${newLongTerms.length}명의 고객이 장기 고객 리스트로 복사되었습니다.\n`
    if (updatedLongTerms.length > 0) msg += `${updatedLongTerms.length}명의 고객 정보가 장기 고객 리스트에 업데이트되었습니다.`
    
    alert(msg.trim())
  }

  const addLongTermCustomer = async (newCustomer: LongTermCustomer) => {
    const fixedCustomer = {
      ...newCustomer,
      id: toUUID(newCustomer.id),
      전화번호: fixPhoneNumber(newCustomer.전화번호 || ''),
      핸드폰번호: fixPhoneNumber(newCustomer.핸드폰번호 || ''),
      설치전화번호: fixPhoneNumber(newCustomer.설치전화번호 || '')
    }

    setLongTermCustomersState(prev => {
      const updated = [...prev, fixedCustomer]
      localStorage.setItem('longTermCustomers', JSON.stringify(updated))
      return updated
    })

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('long_term_customers').insert([fixedCustomer])
        if (error) {
          console.error('Supabase long term insert error:', error)
          alert(`서버 저장 실패: ${error.message || JSON.stringify(error)}`)
        }
      } catch (err) {
        console.error('Supabase long term sync error:', err)
      }
    }
  }

  const updateLongTermCustomer = async (id: string, updates: Partial<LongTermCustomer>) => {
    let targetDb: Partial<LongTermCustomer> | null = null
    const updated = longTermCustomers.map(c => {
      if (c.id === id) {
        targetDb = { ...c, ...updates, updated_at: new Date().toISOString() }
        return targetDb as LongTermCustomer
      }
      return c
    })
    
    setLongTermCustomersState(updated)
    localStorage.setItem('longTermCustomers', JSON.stringify(updated))

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured && targetDb) {
      await supabase.from('long_term_customers').update(targetDb).eq('id', id)
    }
  }

  const changeLongTermCustomerStatus = async (ids: string[], newStatus: string) => {
    const updated = longTermCustomers.map(c => ids.includes(c.id) ? { ...c, status: newStatus } : c)
    setLongTermCustomersState(updated)
    localStorage.setItem('longTermCustomers', JSON.stringify(updated))

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      try {
        const updatePromises = ids.map(id => supabase.from('long_term_customers').update({ status: newStatus }).eq('id', id))
        await Promise.all(updatePromises)
      } catch (err) {
        console.error('Supabase long term status update error:', err)
      }
    }
  }

  const updateLongTermCustomerCoords = async (id: string, lat: number, lng: number) => {
    let targetDb: Partial<LongTermCustomer> | null = null
    const updated = longTermCustomers.map(c => {
      if (c.id === id) {
        targetDb = { ...c, lat, lng }
        const { 현장메모, ...dbObj } = targetDb as any
        targetDb = dbObj
        return { ...c, lat, lng }
      }
      return c
    })
    setLongTermCustomersState(updated)
    localStorage.setItem('longTermCustomers', JSON.stringify(updated))
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured && targetDb) {
      await supabase.from('long_term_customers').update({ lat, lng }).eq('id', id)
    }
  }

  const deleteLongTermCustomers = async (ids: string[]) => {
    const updated = longTermCustomers.filter(c => !ids.includes(c.id))
    setLongTermCustomersState(updated)
    localStorage.setItem('longTermCustomers', JSON.stringify(updated))

    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      await supabase.from('long_term_customers').delete().in('id', ids)
    }
  }

  const clearAllLongTermCustomers = async () => {
    setLongTermCustomersState([])
    localStorage.removeItem('longTermCustomers')
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      await supabase.from('long_term_customers').delete().neq('id', '')
    }
  }

  const restoreLongTermFromBackup = async (backupData: LongTermCustomer[]) => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const fixedData = backupData.map(c => ({ ...c, id: toUUID(c.id) }))
    if (isSupabaseConfigured) {
      try {
        await supabase.from('long_term_customers').delete().neq('id', '')
        await supabase.from('long_term_customers').upsert(fixedData)
      } catch (err) {
        console.error('Supabase long term clear before restore error:', err)
      }
    }
    setLongTermCustomersState(fixedData)
    localStorage.setItem('longTermCustomers', JSON.stringify(fixedData))
  }

  // --- 가입고객 관리 함수 ---
  
  const setSubscribedCustomers = async (data: SubscribedCustomer[]) => {
    setSubscribedCustomersState(data)
    localStorage.setItem('subscribedCustomers', JSON.stringify(data))
  }

  const addSubscribedCustomer = async (newCustomer: SubscribedCustomer) => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (isSupabaseConfigured) {
      // DB에 실제 존재하는 컬럼만 추출해서 insert (스키마 캐시 오류 방지)
      const dbPayload: Record<string, unknown> = {
        id: newCustomer.id,
        고객번호: newCustomer.고객번호,
        모델명: newCustomer.모델명,
        계약일자: newCustomer.계약일자,
        계약만료일자: newCustomer.계약만료일자,
        status: newCustomer.status,
        계약자구분: newCustomer.계약자구분,
        고객명_상호: newCustomer.고객명_상호,
        사업자번호: newCustomer.사업자번호,
        전화번호: newCustomer.전화번호,
        핸드폰번호: newCustomer.핸드폰번호,
        주소: newCustomer.주소,
        설치처구분: newCustomer.설치처구분,
        설치자명: newCustomer.설치자명,
        설치구분: newCustomer.설치구분,
        설치전화번호: newCustomer.설치전화번호,
        설치핸드폰번호: newCustomer.설치핸드폰번호,
        설치주소: newCustomer.설치주소,
        설치시특이사항: newCustomer.설치시특이사항,
      }
      // 선택적 컬럼은 값이 있을 때만 포함
      if (newCustomer.현장메모 !== undefined) dbPayload['현장메모'] = newCustomer.현장메모
      if (newCustomer.lat !== undefined) dbPayload['lat'] = newCustomer.lat
      if (newCustomer.lng !== undefined) dbPayload['lng'] = newCustomer.lng
      if ((newCustomer as any).약정 !== undefined) dbPayload['약정'] = (newCustomer as any).약정
      if ((newCustomer as any).가입유형 !== undefined) dbPayload['가입유형'] = (newCustomer as any).가입유형
      if ((newCustomer as any).월렌탈료 !== undefined) dbPayload['월렌탈료'] = (newCustomer as any).월렌탈료
      if ((newCustomer as any).생년월일 !== undefined) dbPayload['생년월일'] = (newCustomer as any).생년월일

      const { error } = await supabase.from('subscribed_customers').insert([dbPayload])
      if (error) {
        console.error('Supabase subscribed insert error:', error)
        alert('서버 저장 실패')
      }
    }
    setSubscribedCustomersState(prev => {
      const updated = [newCustomer, ...prev]
      localStorage.setItem('subscribedCustomers', JSON.stringify(updated))
      return updated
    })
  }


  const updateSubscribedCustomer = async (id: string, updates: Partial<SubscribedCustomer>) => {
    let targetDb: Partial<SubscribedCustomer> | null = null
    const updated = subscribedCustomers.map(c => {
      if (c.id === id) {
        targetDb = { ...c, ...updates }
        return targetDb as SubscribedCustomer
      }
      return c
    })
    setSubscribedCustomersState(updated)
    localStorage.setItem('subscribedCustomers', JSON.stringify(updated))

    if (targetDb && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error } = await supabase.from('subscribed_customers').update(targetDb).eq('id', id)
      if (error) console.error('Supabase update error:', error)
    }
  }

  const changeSubscribedCustomerStatus = async (ids: string[], newStatus: string) => {
    const updated = subscribedCustomers.map(c => 
      ids.includes(c.id) ? { ...c, status: newStatus } : c
    )
    setSubscribedCustomersState(updated)
    localStorage.setItem('subscribedCustomers', JSON.stringify(updated))

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error } = await supabase.from('subscribed_customers').update({ status: newStatus }).in('id', ids)
      if (error) console.error('Supabase status update error:', error)
    }
  }

  const deleteSubscribedCustomers = async (ids: string[]) => {
    const updated = subscribedCustomers.filter(c => !ids.includes(c.id))
    setSubscribedCustomersState(updated)
    localStorage.setItem('subscribedCustomers', JSON.stringify(updated))

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const { error } = await supabase.from('subscribed_customers').delete().in('id', ids)
      if (error) console.error('Supabase delete error:', error)
    }
  }

  const copyToSubscribed = async (customerIds: string[]) => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const targets = customers.filter(c => customerIds.includes(c.id))
    if (targets.length === 0) return

    const newSubscribed: SubscribedCustomer[] = []
    const updatedSubscribed: SubscribedCustomer[] = []
    const currentList = [...subscribedCustomers]

    for (const c of targets) {
      const subId = toUUID(c.id)
      const existingIndex = currentList.findIndex(sub => sub.id === subId || (sub.고객명_상호 === (c.고객명_상호 || '') && sub.고객번호 === (c.고객번호 || '')))
      
      if (existingIndex >= 0) {
        const existing = currentList[existingIndex]
        const updatedSub = { ...existing }
        let hasChanges = false

        if (c.계약만료일자 && updatedSub.계약만료일자 !== c.계약만료일자) { updatedSub.계약만료일자 = c.계약만료일자; hasChanges = true }
        if (c.전화번호 && updatedSub.전화번호 !== c.전화번호) { updatedSub.전화번호 = c.전화번호; hasChanges = true }
        if (c.핸드폰번호 && updatedSub.핸드폰번호 !== c.핸드폰번호) { updatedSub.핸드폰번호 = c.핸드폰번호; hasChanges = true }
        if (c.주소 && updatedSub.주소 !== c.주소) { updatedSub.주소 = c.주소; hasChanges = true }

        if (hasChanges) {
          currentList[existingIndex] = updatedSub
          updatedSubscribed.push(updatedSub)
        }
      } else {
        const newSub: SubscribedCustomer = {
          id: subId,
          고객번호: c.고객번호 || '',
          모델명: c.모델명 || '',
          계약일자: c.계약일자 || '',
          계약만료일자: c.계약만료일자 || '',
          예약일자: c.예약일자 || '',
          당월작업: c.당월작업 || '',
          최종작업내용: c.최종작업내용 || '',
          status: '미분류',
          계약자구분: c.계약자구분 || '',
          고객명_상호: c.고객명_상호 || '',
          사업자번호: c.사업자번호 || '',
          전화번호: c.전화번호 || '',
          핸드폰번호: c.핸드폰번호 || '',
          주소: c.주소 || '',
          설치처구분: c.설치처구분 || '',
          설치자명: c.설치자명 || '',
          설치구분: c.설치구분 || '',
          설치전화번호: c.설치전화번호 || '',
          설치핸드폰번호: c.설치핸드폰번호 || '',
          설치주소: c.설치주소 || '',
          설치시특이사항: c.설치시특이사항 || '',
          현장메모: c.현장메모 || '',
          created_at: new Date().toISOString()
        }
        newSubscribed.push(newSub)
        currentList.push(newSub)
      }
    }

    if (newSubscribed.length === 0 && updatedSubscribed.length === 0) {
      alert('업데이트되거나 새로 가입고객으로 복사될 데이터가 없습니다.')
      return
    }

    setSubscribedCustomersState(currentList)
    localStorage.setItem('subscribedCustomers', JSON.stringify(currentList))

    if (isSupabaseConfigured) {
      try {
        const upsertData = [...newSubscribed, ...updatedSubscribed]
        const { error } = await supabase.from('subscribed_customers').upsert(upsertData)
        if (error) {
          console.error('Supabase subscribed upsert error:', error)
          alert(`서버 저장 실패: ${error.message || JSON.stringify(error)}`)
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  const copyLongTermToSubscribed = async (longTermIds: string[]) => {
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const targets = longTermCustomers.filter(c => longTermIds.includes(c.id))
    if (targets.length === 0) return

    const newSubscribed: SubscribedCustomer[] = []
    const updatedSubscribed: SubscribedCustomer[] = []
    const currentList = [...subscribedCustomers]

    for (const c of targets) {
      const subId = toUUID(c.id)
      const existingIndex = currentList.findIndex(sub => sub.id === subId || (sub.고객명_상호 === (c.이름 || '') && sub.고객번호 === (c.고객번호 || '')))

      if (existingIndex >= 0) {
        const existing = currentList[existingIndex]
        const updatedSub = { ...existing }
        let hasChanges = false
        if (c.계약만료일 && updatedSub.계약만료일자 !== c.계약만료일) { updatedSub.계약만료일자 = c.계약만료일; hasChanges = true }
        if (hasChanges) {
          currentList[existingIndex] = updatedSub
          updatedSubscribed.push(updatedSub)
        }
      } else {
        const newSub: SubscribedCustomer = {
          id: subId,
          고객번호: c.고객번호 || '',
          모델명: c.모델명 || '',
          계약일자: c.계약일자 || '',
          계약만료일자: c.계약만료일 || '',
          예약일자: '',
          당월작업: '',
          최종작업내용: '',
          status: '미분류',
          계약자구분: '',
          고객명_상호: c.이름 || '',
          사업자번호: '',
          전화번호: c.전화번호 || '',
          핸드폰번호: c.핸드폰번호 || '',
          주소: c.주소 || '',
          설치처구분: '',
          설치자명: '',
          설치구분: '',
          설치전화번호: c.전화번호 || '',
          설치핸드폰번호: c.핸드폰번호 || '',
          설치주소: c.주소 || '',
          설치시특이사항: '',
          created_at: new Date().toISOString()
        }
        newSubscribed.push(newSub)
        currentList.push(newSub)
      }
    }

    if (newSubscribed.length === 0 && updatedSubscribed.length === 0) {
      alert('업데이트되거나 새로 가입고객으로 복사될 데이터가 없습니다.')
      return
    }

    setSubscribedCustomersState(currentList)
    localStorage.setItem('subscribedCustomers', JSON.stringify(currentList))

    if (isSupabaseConfigured) {
      try {
        const upsertData = [...newSubscribed, ...updatedSubscribed]
        const { error } = await supabase.from('subscribed_customers').upsert(upsertData)
        if (error) console.error('Supabase subscribed upsert error:', error)
      } catch (err) {
        console.error(err)
      }
    }

    if (newSubscribed.length > 0) alert(`${newSubscribed.length}명의 장기고객이 가입고객으로 복사되었습니다.`)
    if (updatedSubscribed.length > 0) alert(`${updatedSubscribed.length}명의 가입고객 정보가 업데이트되었습니다.`)
  }

  const clearAllSubscribedCustomers = async () => {
    setSubscribedCustomersState([])
    localStorage.removeItem('subscribedCustomers')
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        await supabase.from('subscribed_customers').delete().neq('id', 'dummy')
      } catch(e) {}
    }
  }

  const syncMemosWithManagement = async (): Promise<{ successCount: number; failedCount: number }> => {
    // 메모 동기화 - 현재는 기본 구현
    return { successCount: 0, failedCount: 0 }
  }

  const restoreSubscribedFromBackup = async (backupData: SubscribedCustomer[]) => {
    if (!backupData || !Array.isArray(backupData)) return
    
    setSubscribedCustomersState(backupData)
    localStorage.setItem('subscribedCustomers', JSON.stringify(backupData))
    
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        await supabase.from('subscribed_customers').delete().neq('id', 'dummy')
        const chunkSize = 100
        for (let i = 0; i < backupData.length; i += chunkSize) {
          const chunk = backupData.slice(i, i + chunkSize)
          const { error } = await supabase.from('subscribed_customers').insert(chunk)
          if (error) console.error('Supabase subscribed restore error:', error)
        }
      } catch(e) {
        console.error(e)
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
      updateCustomer,
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
      deleteSmsTemplate,
      longTermCustomers,
      setLongTermCustomers,
      addLongTermCustomer,
      copyToLongTerm,
      updateLongTermCustomer,
      changeLongTermCustomerStatus,
      updateLongTermCustomerCoords,
      deleteLongTermCustomers,
      clearAllLongTermCustomers,
      restoreLongTermFromBackup,
      subscribedCustomers,
      setSubscribedCustomers,
      updateSubscribedCustomer,
      addSubscribedCustomer,
      changeSubscribedCustomerStatus,
      deleteSubscribedCustomers,
      copyToSubscribed,
      copyLongTermToSubscribed,
      clearAllSubscribedCustomers,
      restoreSubscribedFromBackup,
      syncMemosWithManagement
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
