import React, { useState, useEffect } from 'react'
import { getSubscribedBackupList, deleteSubscribedBackups, getSubscribedBackupData, saveSubscribedBackup } from '@/lib/backupUtils'
import { useData } from '@/lib/DataContext'
import { X, Trash2, RotateCcw, AlertTriangle, Plus } from 'lucide-react'

interface SubscribedBackupManagerModalProps {
  onClose: () => void
}

export default function SubscribedBackupManagerModal({ onClose }: SubscribedBackupManagerModalProps) {
  const [backups, setBackups] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const { restoreSubscribedFromBackup, subscribedCustomers } = useData()

  const loadBackups = async () => {
    setIsLoading(true)
    try {
      const list = await getSubscribedBackupList()
      setBackups(list)
    } catch (e) {
      console.error('Failed to load backups', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBackups()
  }, [])

  const handleToggleSelectAll = () => {
    if (selectedIds.size === backups.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(backups.map(b => b.id)))
    }
  }

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`선택한 ${selectedIds.size}개의 가입 고객 백업을 삭제하시겠습니까?`)) return
    
    try {
      await deleteSubscribedBackups(Array.from(selectedIds))
      setSelectedIds(new Set())
      await loadBackups()
      alert('선택한 백업이 삭제되었습니다.')
    } catch (e) {
      console.error('Failed to delete backups', e)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleRestore = async (id: string, name: string) => {
    if (!confirm(`[${name}] 백업으로 복원하시겠습니까?\n\n⚠️ 주의: 기존 데이터는 완전히 삭제되고 백업 시점의 가입 고객 데이터로 교체됩니다!`)) return
    
    try {
      const backupItem = await getSubscribedBackupData(id)
      if (backupItem && backupItem.data) {
        await restoreSubscribedFromBackup(backupItem.data)
        alert('가입 고객 데이터가 성공적으로 복원되었습니다.')
        onClose()
      } else {
        alert('백업 데이터를 불러올 수 없습니다.')
      }
    } catch (e) {
      console.error('Failed to restore backup', e)
      alert('복원 중 오류가 발생했습니다.')
    }
  }

  const handleManualBackup = async () => {
    if (!confirm('현재 가입 고객 데이터로 즉시 수동 백업을 생성하시겠습니까?')) return
    try {
      await saveSubscribedBackup(subscribedCustomers)
      localStorage.setItem('lastSubscribedBackupTime', Date.now().toString())
      await loadBackups()
      alert('가입 고객 백업이 생성되었습니다.')
    } catch (e) {
      console.error('Failed to create manual backup', e)
      alert('백업 생성 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content backup-modal">
        <div className="modal-header">
          <h2>가입 고객 자동 백업 관리</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="backup-actions">
            <button className="manual-backup-btn" onClick={handleManualBackup}>
              <Plus size={16} /> 수동 백업
            </button>
            <div className="right-actions">
              <label className="select-all-label">
                <input 
                  type="checkbox" 
                  checked={backups.length > 0 && selectedIds.size === backups.length}
                  onChange={handleToggleSelectAll}
                  disabled={backups.length === 0}
                />
                전체
              </label>
              <button 
                className="delete-selected-btn" 
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
              >
                <Trash2 size={16} /> 삭제
              </button>
            </div>
          </div>

          <div className="backup-list">
            {isLoading ? (
              <div className="empty-state">백업 리스트를 불러오는 중...</div>
            ) : backups.length === 0 ? (
              <div className="empty-state">생성된 백업이 없습니다.</div>
            ) : (
              backups.map(backup => (
                <div key={backup.id} className="backup-item">
                  <div className="backup-item-left">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(backup.id)}
                      onChange={() => handleToggleSelect(backup.id)}
                    />
                    <div className="backup-info">
                      <span className="backup-name">{backup.name}</span>
                    </div>
                  </div>
                  <button 
                    className="restore-btn"
                    onClick={() => handleRestore(backup.id, backup.name)}
                  >
                    <RotateCcw size={16} /> 복원
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="backup-notice">
            <AlertTriangle size={14} /> 최대 50개까지만 보관되며 오래된 백업은 자동 삭제됩니다.
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-content { background: #fff; width: 100%; max-width: 500px; border-radius: 20px; display: flex; flex-direction: column; max-height: 90vh; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; }
        .modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1e293b; }
        .close-btn { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; display: flex; }
        .modal-body { padding: 20px 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
        
        .backup-actions { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .manual-backup-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
        .manual-backup-btn:hover { background: #bae6fd; }
        
        .right-actions { display: flex; align-items: center; gap: 12px; }
        .select-all-label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; }
        .delete-selected-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .delete-selected-btn:hover:not(:disabled) { background: #fecaca; }
        .delete-selected-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .backup-list { display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; background: #f8fafc; }
        .empty-state { text-align: center; padding: 30px; color: #94a3b8; font-size: 0.9rem; }
        
        .backup-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; transition: all 0.2s; }
        .backup-item:hover { border-color: #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .backup-item-left { display: flex; align-items: center; gap: 12px; }
        .backup-info { display: flex; flex-direction: column; gap: 2px; }
        .backup-name { font-size: 0.9rem; font-weight: 700; color: #1e293b; }
        .backup-date { font-size: 0.75rem; color: #64748b; }
        
        .restore-btn { display: flex; align-items: center; gap: 4px; padding: 6px 10px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #10b981; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .restore-btn:hover { background: #d1fae5; }
        
        .backup-notice { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #f59e0b; background: #fffbeb; padding: 10px; border-radius: 8px; border: 1px solid #fef3c7; }
      `}</style>
    </div>
  )
}
