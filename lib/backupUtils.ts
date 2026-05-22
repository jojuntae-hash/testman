import { CustomerData } from './DataContext'

const DB_NAME = 'testmanBackupDB'
const DB_VERSION = 1
const STORE_NAME = 'backups'
const MAX_BACKUPS = 50

export interface BackupItem {
  id: string
  name: string
  timestamp: number
  data: CustomerData[]
}

// IndexedDB 초기화 및 오픈
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = (event) => reject(request.error)
    request.onsuccess = (event) => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`
}

// 50개 초과 시 오래된 데이터 삭제 로직
async function enforceMaxBackups(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const allBackups = request.result as BackupItem[]
      if (allBackups.length > MAX_BACKUPS) {
        allBackups.sort((a, b) => a.timestamp - b.timestamp)
        const backupsToDelete = allBackups.slice(0, allBackups.length - MAX_BACKUPS)
        
        for (const backup of backupsToDelete) {
          store.delete(backup.id)
        }
      }
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

// 백업 생성
export async function saveBackup(data: CustomerData[]): Promise<void> {
  const db = await openDB()
  const now = new Date()
  const id = Date.now().toString()
  const name = `testman_${formatDate(now)}`

  const backupItem: BackupItem = {
    id,
    name,
    timestamp: now.getTime(),
    data: JSON.parse(JSON.stringify(data)), // 깊은 복사
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(backupItem)

    request.onsuccess = () => {
      enforceMaxBackups(db).then(resolve).catch(reject)
    }
    request.onerror = () => reject(request.error)
  })
}

// 백업 리스트 조회 (UI 용이므로 데이터는 포함하지 않거나 포함해서 로드)
export async function getBackupList(): Promise<Omit<BackupItem, 'data'>[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const allBackups = request.result as BackupItem[]
      const list = allBackups.map((b) => ({
        id: b.id,
        name: b.name,
        timestamp: b.timestamp,
      }))
      list.sort((a, b) => b.timestamp - a.timestamp) // 최신순
      resolve(list)
    }
    request.onerror = () => reject(request.error)
  })
}

// 특정 백업 상세 데이터 가져오기
export async function getBackupData(id: string): Promise<BackupItem | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// 여러 백업 삭제
export async function deleteBackups(ids: string[]): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    for (const id of ids) {
      store.delete(id)
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
