import { CustomerData, LongTermCustomer, SubscribedCustomer } from './DataContext'
import { supabase } from './supabase'

const MAX_BACKUPS = 50

export interface BackupItem {
  id: string
  name: string
  timestamp: number
  data: CustomerData[]
}

function formatDate(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${yy}${mm}${dd}_${hh}${min}`
}

// 50개 초과 시 오래된 데이터 삭제 로직
async function enforceMaxBackups(): Promise<void> {
  const { data, error } = await supabase
    .from('backups')
    .select('id, timestamp')
    .order('timestamp', { ascending: true })
  
  if (error || !data) return

  if (data.length > MAX_BACKUPS) {
    const toDelete = data.slice(0, data.length - MAX_BACKUPS)
    const idsToDelete = toDelete.map((d: any) => d.id)
    await supabase.from('backups').delete().in('id', idsToDelete)
  }
}

// 백업 생성
export async function saveBackup(data: CustomerData[]): Promise<void> {
  const now = new Date()
  const id = Date.now().toString()
  const name = `J_${formatDate(now)}`

  const backupItem: BackupItem = {
    id,
    name,
    timestamp: now.getTime(),
    data: JSON.parse(JSON.stringify(data)), // 깊은 복사
  }

  const { error } = await supabase.from('backups').insert(backupItem)
  if (error) {
    console.error('Backup save error:', error)
    throw error
  }

  await enforceMaxBackups()
}

// 백업 리스트 조회 (데이터 제외)
export async function getBackupList(): Promise<Omit<BackupItem, 'data'>[]> {
  const { data, error } = await supabase
    .from('backups')
    .select('id, name, timestamp')
    .order('timestamp', { ascending: false })
    
  if (error) {
    console.error('Backup list fetch error:', error)
    return []
  }
  return data as Omit<BackupItem, 'data'>[]
}

// 특정 백업 상세 데이터 가져오기
export async function getBackupData(id: string): Promise<BackupItem | undefined> {
  const { data, error } = await supabase
    .from('backups')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) {
    console.error('Backup data fetch error:', error)
    return undefined
  }
  return data as BackupItem
}

// 여러 백업 삭제
export async function deleteBackups(ids: string[]): Promise<void> {
  const { error } = await supabase.from('backups').delete().in('id', ids)
  if (error) {
    console.error('Backup delete error:', error)
    throw error
  }
}

export interface LongTermBackupItem {
  id: string
  name: string
  timestamp: number
  data: LongTermCustomer[]
}

// 50개 초과 시 오래된 장기 고객 백업 삭제 로직
async function enforceMaxLongTermBackups(): Promise<void> {
  const { data, error } = await supabase
    .from('long_term_backups')
    .select('id, timestamp')
    .order('timestamp', { ascending: true })
  
  if (error || !data) return

  if (data.length > MAX_BACKUPS) {
    const toDelete = data.slice(0, data.length - MAX_BACKUPS)
    const idsToDelete = toDelete.map((d: any) => d.id)
    await supabase.from('long_term_backups').delete().in('id', idsToDelete)
  }
}

// 장기 고객 데이터 백업 생성
export async function saveLongTermBackup(data: LongTermCustomer[]): Promise<void> {
  const now = new Date()
  const id = Date.now().toString()
  const name = `J_LT_${formatDate(now)}`

  const backupItem: LongTermBackupItem = {
    id,
    name,
    timestamp: now.getTime(),
    data: JSON.parse(JSON.stringify(data)), // 깊은 복사
  }

  const { error } = await supabase.from('long_term_backups').insert(backupItem)
  if (error) {
    console.error('Long term backup save error:', error)
    throw error
  }

  await enforceMaxLongTermBackups()
}

// 장기 고객 데이터 백업 리스트 조회 (데이터 제외)
export async function getLongTermBackupList(): Promise<Omit<LongTermBackupItem, 'data'>[]> {
  const { data, error } = await supabase
    .from('long_term_backups')
    .select('id, name, timestamp')
    .order('timestamp', { ascending: false })
    
  if (error) {
    console.error('Long term backup list fetch error:', error)
    return []
  }
  return data as Omit<LongTermBackupItem, 'data'>[]
}

// 특정 장기 고객 데이터 백업 상세 가져오기
export async function getLongTermBackupData(id: string): Promise<LongTermBackupItem | undefined> {
  const { data, error } = await supabase
    .from('long_term_backups')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) {
    console.error('Long term backup data fetch error:', error)
    return undefined
  }
  return data as LongTermBackupItem
}

// 여러 장기 고객 데이터 백업 삭제
export async function deleteLongTermBackups(ids: string[]): Promise<void> {
  const { error } = await supabase.from('long_term_backups').delete().in('id', ids)
  if (error) {
    console.error('Long term backup delete error:', error)
    throw error
  }
}


export interface SubscribedBackupItem {
  id: string
  name: string
  timestamp: number
  data: SubscribedCustomer[]
}

// 50개 초과 시 오래된 장기 고객 백업 삭제 로직
async function enforceMaxSubscribedBackups(): Promise<void> {
  const { data, error } = await supabase
    .from('subscribed_backups')
    .select('id, timestamp')
    .order('timestamp', { ascending: true })
  
  if (error || !data) return

  if (data.length > MAX_BACKUPS) {
    const toDelete = data.slice(0, data.length - MAX_BACKUPS)
    const idsToDelete = toDelete.map((d: any) => d.id)
    await supabase.from('subscribed_backups').delete().in('id', idsToDelete)
  }
}

// 가입 고객 데이터 백업 생성
export async function saveSubscribedBackup(data: SubscribedCustomer[]): Promise<void> {
  const now = new Date()
  const id = Date.now().toString()
  const name = `J_SUB_${formatDate(now)}`

  const backupItem: SubscribedBackupItem = {
    id,
    name,
    timestamp: now.getTime(),
    data: JSON.parse(JSON.stringify(data)), // 깊은 복사
  }

  const { error } = await supabase.from('subscribed_backups').insert(backupItem)
  if (error) {
    console.error('Subscribed backup save error:', error)
    throw error
  }

  await enforceMaxSubscribedBackups()
}

// 가입 고객 데이터 백업 리스트 조회 (데이터 제외)
export async function getSubscribedBackupList(): Promise<Omit<SubscribedBackupItem, 'data'>[]> {
  const { data, error } = await supabase
    .from('subscribed_backups')
    .select('id, name, timestamp')
    .order('timestamp', { ascending: false })
    
  if (error) {
    console.error('Subscribed backup list fetch error:', error)
    return []
  }
  return data as Omit<SubscribedBackupItem, 'data'>[]
}

// 특정 가입 고객 데이터 백업 상세 가져오기
export async function getSubscribedBackupData(id: string): Promise<SubscribedBackupItem | undefined> {
  const { data, error } = await supabase
    .from('subscribed_backups')
    .select('*')
    .eq('id', id)
    .single()
    
  if (error) {
    console.error('Subscribed backup data fetch error:', error)
    return undefined
  }
  return data as SubscribedBackupItem
}

// 여러 가입 고객 데이터 백업 삭제
export async function deleteSubscribedBackups(ids: string[]): Promise<void> {
  const { error } = await supabase.from('subscribed_backups').delete().in('id', ids)
  if (error) {
    console.error('Subscribed backup delete error:', error)
    throw error
  }
}
