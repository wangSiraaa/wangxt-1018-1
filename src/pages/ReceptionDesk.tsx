import { useState, useMemo } from 'react'
import {
  Users,
  Building2,
  Phone,
  CameraOff,
  ShieldAlert,
  Package,
  CheckCircle2,
  IdCard,
  QrCode,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle, PageActions } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Modal from '@/components/Modal'
import Alert from '@/components/Alert'
import { statusBadge, formatDateTime, todayStr, maskPhone, cn } from '@/lib/utils'
import type { VisitRecord, MaterialItem } from '@/types'

type TabType = 'pending' | 'checked' | 'visiting'

export default function ReceptionDesk() {
  const records = useAppStore((s) => s.records)
  const batches = useAppStore((s) => s.batches)
  const checkIn = useAppStore((s) => s.checkIn)
  const collectMaterials = useAppStore((s) => s.collectMaterials)
  const currentUser = useAppStore((s) => s.currentUser)

  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [alert, setAlert] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [materialModal, setMaterialModal] = useState<{ open: boolean; record: VisitRecord | null }>({
    open: false,
    record: null,
  })
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])

  const today = todayStr()

  const todayRecords = useMemo(() => {
    return records.filter((r) => {
      const batch = batches.find((b) => b.id === r.batchId)
      return batch?.date === today && !['cancelled', 'rejected', 'waiting_list'].includes(r.status)
    })
  }, [records, batches, today])

  const pendingList = useMemo(
    () => todayRecords.filter((r) => ['approved', 'nda_pending', 'pending_approval'].includes(r.status)),
    [todayRecords],
  )
  const checkedList = useMemo(() => todayRecords.filter((r) => r.status === 'checked_in'), [todayRecords])
  const visitingList = useMemo(
    () => todayRecords.filter((r) => ['visiting', 'material_collected'].includes(r.status)),
    [todayRecords],
  )

  const displayList =
    activeTab === 'pending' ? pendingList : activeTab === 'checked' ? checkedList : visitingList

  const showAlert = (tone: 'success' | 'error' | 'info', message: string) => {
    setAlert({ tone, message })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleCheckIn = (record: VisitRecord) => {
    const result = checkIn(record.id, currentUser)
    if (result.success) {
      showAlert('success', `${record.companyName} ${record.totalPeople}人签到成功！`)
    } else {
      showAlert('error', result.message || '签到失败')
    }
  }

  const openMaterialModal = (record: VisitRecord) => {
    setMaterialModal({ open: true, record })
    const collected = record.materials.filter((m) => m.collectedAt).map((m) => m.id)
    setSelectedMaterials(collected)
  }

  const toggleMaterial = (id: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const confirmCollect = () => {
    if (!materialModal.record) return
    const uncollected = materialModal.record.materials.filter((m) => !m.collectedAt).map((m) => m.id)
    const toCollect = selectedMaterials.filter((id) => uncollected.includes(id))
    if (toCollect.length > 0) {
      collectMaterials(materialModal.record.id, currentUser, toCollect)
      showAlert('success', `已领取 ${toCollect.length} 项物料`)
    }
    setMaterialModal({ open: false, record: null })
  }

  const getBatchName = (batchId: string) => {
    return batches.find((b) => b.id === batchId)?.name || '—'
  }

  const getPrimaryVisitor = (record: VisitRecord) => {
    return record.visitors.find((v) => v.isPrimary) || record.visitors[0]
  }

  const renderCard = (record: VisitRecord) => {
    const primary = getPrimaryVisitor(record)
    const badge = statusBadge(record.status)
    const cardAllCollected = record.materials.every((m) => m.collectedAt)

    return (
      <div key={record.id} className="card p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {record.batchCode || getBatchName(record.batchId)}
              </span>
              <span className={badge.className}>{badge.label}</span>
              {record.hasSecretZone && (
                <span className="badge bg-red-100 text-red-700">
                  <ShieldAlert className="w-3 h-3" />
                  涉密
                </span>
              )}
              {!record.photoAllowed && (
                <span className="badge bg-slate-200 text-slate-700">
                  <CameraOff className="w-3 h-3" />
                  禁拍
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              {record.companyName}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold text-brand-600 tabular-nums">
              {record.totalPeople}
            </div>
            <div className="text-xs text-slate-500">人</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{primary?.name}（主联系人）</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="tabular-nums">{maskPhone(record.contactPhone)}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <IdCard className="w-4 h-4 text-slate-400 shrink-0" />
            <span>胸卡编号：{record.code.slice(-6)}-01 起</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <QrCode className="w-4 h-4 text-slate-400 shrink-0" />
            <span>预约码：{record.code}</span>
          </div>
        </div>

        {!record.photoAllowed && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
            <CameraOff className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">拍照限制提示：</span>
              本次参观路线包含涉密区域，全程禁止拍摄照片和视频，请保管好个人电子设备。
            </div>
          </div>
        )}

        {record.checkInAt && (
          <div className="mb-4 text-xs text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            签到时间：{formatDateTime(record.checkInAt)}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            申请时间：{formatDateTime(record.appliedAt)}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'pending' && (
              <button
                onClick={() => handleCheckIn(record)}
                className={cn(
                  'btn-primary',
                  record.hasSecretZone && !record.ndaCompleted && 'opacity-60',
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                签到
              </button>
            )}
            {(activeTab === 'checked' || activeTab === 'visiting') && (
              <button
                onClick={() => openMaterialModal(record)}
                className={cn(
                  cardAllCollected ? 'btn-secondary' : 'btn-success',
                )}
              >
                <Package className="w-4 h-4" />
                {cardAllCollected ? '查看物料' : '领取物料'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: '今日待签到', count: pendingList.length },
    { key: 'checked', label: '已签到', count: checkedList.length },
    { key: 'visiting', label: '在馆中', count: visitingList.length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          title="接待签到台"
          desc="处理访客签到、物料发放和涉密路线检查"
        />
        <PageActions>
          <div className="text-sm text-slate-500">
            当前操作人：<span className="font-medium text-slate-700">{currentUser}</span>
          </div>
        </PageActions>
      </PageHeader>

      {alert && (
        <Alert tone={alert.tone} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="今日待签到"
          value={pendingList.length}
          accent="from-amber-500 to-orange-500"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="已签到入场"
          value={checkedList.length + visitingList.length}
          accent="from-emerald-500 to-teal-500"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          title="在馆参观中"
          value={visitingList.length}
          accent="from-sky-500 to-blue-500"
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-1 border-b border-slate-200 px-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={activeTab === t.key ? 'tab-active' : 'tab-inactive'}
            >
              {t.label}
              <span
                className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-xs',
                  activeTab === t.key
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-slate-100 text-slate-500',
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="p-5">
          {displayList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <div>暂无数据</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayList.map(renderCard)}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={materialModal.open}
        onClose={() => setMaterialModal({ open: false, record: null })}
        title={
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            物料清单 - {materialModal.record?.companyName}
          </div>
        }
        size="md"
        footer={
          <>
            <button
              onClick={() => setMaterialModal({ open: false, record: null })}
              className="btn-secondary"
            >
              关闭
            </button>
            <button
              onClick={confirmCollect}
              className="btn-success"
              disabled={
                materialModal.record?.materials.every((m) => m.collectedAt) ||
                selectedMaterials.filter(
                  (id) => !materialModal.record?.materials.find((m) => m.id === id)?.collectedAt,
                ).length === 0
              }
            >
              <CheckCircle2 className="w-4 h-4" />
              确认领取
            </button>
          </>
        }
      >
        {materialModal.record && (
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              胸卡号段：{materialModal.record.code.slice(-6)}-01 ~{' '}
              {materialModal.record.code.slice(-6)}-
              {String(materialModal.record.totalPeople).padStart(2, '0')}
            </div>
            <div className="space-y-2">
              {materialModal.record.materials.map((m: MaterialItem) => {
                const checked = selectedMaterials.includes(m.id)
                return (
                  <label
                    key={m.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                      checked
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300',
                      m.collectedAt && 'opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => !m.collectedAt && toggleMaterial(m.id)}
                      disabled={!!m.collectedAt}
                      className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 flex items-center gap-2">
                        {m.name}
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          x{m.quantity}
                        </span>
                      </div>
                      {m.collectedAt && (
                        <div className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          已领取 · {formatDateTime(m.collectedAt)} · {m.collectedBy}
                        </div>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
