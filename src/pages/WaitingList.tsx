import { useState, useMemo } from 'react'
import {
  Clock,
  Users,
  Building2,
  CalendarClock,
  Timer,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Zap,
  Crown,
  Hash,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle, PageActions } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Alert from '@/components/Alert'
import { statusBadge, formatDateTime, cn, maskPhone } from '@/lib/utils'
import type { VisitRecord, VisitBatch } from '@/types'

function calcWaitDuration(appliedAt: string): string {
  const diff = Date.now() - new Date(appliedAt).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}小时${mins}分钟`
  return `${mins}分钟`
}

function getRandomCancelableRecord(records: VisitRecord[], excludeBatchId: string): VisitRecord | null {
  const candidates = records.filter(
    (r) =>
      r.batchId !== excludeBatchId &&
      !r.inWaitingList &&
      ['approved', 'nda_pending', 'pending_approval'].includes(r.status),
  )
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export default function WaitingList() {
  const records = useAppStore((s) => s.records)
  const batches = useAppStore((s) => s.batches)
  const cancelVisitRecord = useAppStore((s) => s.cancelVisitRecord)
  const processWaitingListPromotion = useAppStore((s) => s.processWaitingListPromotion)
  const getBatchUsedCapacity = useAppStore((s) => s.getBatchUsedCapacity)
  const currentUser = useAppStore((s) => s.currentUser)
  const updateRecordStatus = useAppStore((s) => s.updateRecordStatus)
  const addAuditLog = useAppStore((s) => s.addAuditLog)

  const [toast, setToast] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [alert, setAlert] = useState<{ tone: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null)

  const waitingRecords = useMemo(
    () => records.filter((r) => r.inWaitingList),
    [records],
  )

  const waitingByBatch = useMemo(() => {
    const grouped = new Map<string, VisitRecord[]>()
    waitingRecords.forEach((r) => {
      if (!grouped.has(r.batchId)) grouped.set(r.batchId, [])
      grouped.get(r.batchId)!.push(r)
    })
    const result: { batch: VisitBatch; list: VisitRecord[] }[] = []
    grouped.forEach((list, batchId) => {
      const batch = batches.find((b) => b.id === batchId)
      if (batch) {
        list.sort((a, b) => (a.waitingRank ?? 9999) - (b.waitingRank ?? 9999))
        result.push({ batch, list })
      }
    })
    result.sort((a, b) => a.batch.date.localeCompare(b.batch.date) || a.batch.startTime.localeCompare(b.batch.startTime))
    return result
  }, [waitingRecords, batches])

  const totalWaitingPeople = useMemo(
    () => waitingRecords.reduce((sum, r) => sum + r.totalPeople, 0),
    [waitingRecords],
  )

  const batchesWithWaiting = waitingByBatch.length

  const showToast = (tone: 'success' | 'error' | 'info', message: string) => {
    setToast({ tone, message })
    setTimeout(() => setToast(null), 4000)
  }

  const showAlert = (tone: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setAlert({ tone, message })
    setTimeout(() => setAlert(null), 4000)
  }

  const handleManualPromote = (record: VisitRecord) => {
    const batch = batches.find((b) => b.id === record.batchId)
    if (!batch) return
    const used = getBatchUsedCapacity(batch.id)
    if (used + record.totalPeople > batch.capacity) {
      showAlert(
        'warning',
        `批次「${batch.name}」容量不足（已用${used}/${batch.capacity}），无法直接转正。请先取消其他预约释放名额。`,
      )
      return
    }
    const route = useAppStore.getState().routes.find((r) => r.id === batch.routeId)
    updateRecordStatus(record.id, route?.requiresNda ? 'pending_approval' : 'approved', {
      inWaitingList: false,
      waitingRank: undefined,
    })
    useAppStore.getState().computeWaitingRanks()
    addAuditLog({
      operator: currentUser,
      action: '手动优先转正',
      targetType: 'VisitRecord',
      targetId: record.id,
      targetName: record.companyName,
      details: `管理员手动将候补预约转为正式预约`,
    })
    showToast('success', `🎉 ${record.companyName}（${record.totalPeople}人）已成功转正！`)
  }

  const handleSimulateCancel = (batch: VisitBatch) => {
    const toCancel = getRandomCancelableRecord(records, batch.id)
    if (!toCancel) {
      showAlert('warning', '当前没有可取消的有效预约来模拟名额释放。')
      return
    }
    const cancelResult = cancelVisitRecord(toCancel.id, `${currentUser}（模拟取消）`)
    if (!cancelResult.success) {
      showAlert('error', cancelResult.message || '取消失败')
      return
    }
    const promoted = processWaitingListPromotion(batch.id)
    if (promoted.length > 0) {
      const names = promoted.map((p) => `${p.companyName}（${p.totalPeople}人）`).join('、')
      showToast(
        'success',
        `✨ ${toCancel.companyName} 取消预约释放 ${toCancel.totalPeople} 个名额，${names} 已自动转正！`,
      )
    } else {
      showToast('info', `${toCancel.companyName} 已取消并释放 ${toCancel.totalPeople} 个名额，暂无符合条件的候补可转正。`)
    }
  }

  const renderRankBadge = (rank: number | undefined) => {
    if (!rank) return null
    const isTop = rank <= 3
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold tabular-nums',
          rank === 1 && 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white',
          rank === 2 && 'bg-gradient-to-r from-slate-300 to-slate-400 text-white',
          rank === 3 && 'bg-gradient-to-r from-orange-300 to-orange-400 text-white',
          !isTop && 'bg-slate-100 text-slate-600',
        )}
      >
        {isTop ? <Crown className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
        第{rank}位
      </span>
    )
  }

  const renderCapacityBar = (batch: VisitBatch) => {
    const used = getBatchUsedCapacity(batch.id)
    const waiting = waitingRecords
      .filter((r) => r.batchId === batch.id)
      .reduce((s, r) => s + r.totalPeople, 0)
    const usedPercent = (used / batch.capacity) * 100
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600 flex items-center gap-1">
            <Users className="w-4 h-4" />
            批次容量
          </span>
          <div className="flex items-center gap-2 tabular-nums">
            <span className="font-semibold text-emerald-600">{used}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-700">{batch.capacity}</span>
            <span className="text-slate-400">已用</span>
            {waiting > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-amber-600 font-medium">候补 {waiting}人</span>
              </>
            )}
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(usedPercent, 100)}%` }}
          />
          {usedPercent >= 90 && (
            <div className="absolute inset-0 flex items-center justify-end pr-2">
              <AlertTriangle className="w-3 h-3 text-white drop-shadow-sm" />
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderCard = (record: VisitRecord, batch: VisitBatch) => {
    const primary = record.visitors.find((v) => v.isPrimary) || record.visitors[0]
    const badge = statusBadge(record.status)
    return (
      <div
        key={record.id}
        className={cn(
          'card p-4 transition-all hover:shadow-md',
          record.waitingRank === 1 && 'ring-2 ring-amber-300 ring-offset-1',
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {renderRankBadge(record.waitingRank)}
            <span className={badge.className}>{badge.label}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-purple-600 tabular-nums">
              {record.totalPeople}
            </div>
            <div className="text-xs text-slate-500">人</div>
          </div>
        </div>

        <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{record.companyName}</span>
        </h4>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-slate-600">
            <CalendarClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{formatDateTime(record.appliedAt)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Timer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>等待 {calcWaitDuration(record.appliedAt)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {primary?.name}（主联系人） {maskPhone(record.contactPhone)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            {record.hasSecretZone && (
              <span className="badge bg-red-100 text-red-700 mr-1">涉密</span>
            )}
            预约码：{record.code}
          </div>
          <button
            onClick={() => handleManualPromote(record)}
            className="btn-warning !py-1.5 !px-3 text-xs"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            手动优先转正
          </button>
        </div>
      </div>
    )
  }

  const renderBatchGroup = ({ batch, list }: { batch: VisitBatch; list: VisitRecord[] }) => {
    const used = getBatchUsedCapacity(batch.id)
    const isFull = used >= batch.capacity
    return (
      <div key={batch.id} className="card overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={cn(
                    'badge',
                    batch.status === 'in_progress'
                      ? 'bg-green-100 text-green-700'
                      : batch.status === 'published'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {statusBadge(batch.status).label}
                </span>
                {isFull && (
                  <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    已满员
                  </span>
                )}
                <span className="text-xs font-mono text-slate-500 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                  {batch.code}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-purple-500" />
                {batch.name}
              </h3>
              <div className="mt-1 text-sm text-slate-600 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {batch.date} {batch.startTime}-{batch.endTime}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  容量 {batch.capacity} 人
                </span>
              </div>
            </div>
            <button
              onClick={() => handleSimulateCancel(batch)}
              className="btn-secondary shrink-0"
            >
              <Zap className="w-4 h-4" />
              模拟取消释放名额
            </button>
          </div>
          {renderCapacityBar(batch)}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((r) => renderCard(r, batch))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 relative">
      <PageHeader>
        <PageTitle
          title="候补队列管理"
          desc="按批次管理候补预约，支持手动优先转正与模拟释放名额触发自动转正"
        />
        <PageActions>
          <div className="text-sm text-slate-500">
            当前操作人：<span className="font-medium text-slate-700">{currentUser}</span>
          </div>
        </PageActions>
      </PageHeader>

      {alert && (
        <Alert tone={alert.tone as any} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      {toast && (
        <div
          className={cn(
            'fixed top-6 right-6 z-[100] max-w-md shadow-2xl rounded-xl p-4 border animate-in slide-in-from-right-8 fade-in duration-300 flex items-start gap-3',
            toast.tone === 'success' && 'bg-emerald-50 border-emerald-200 text-emerald-800',
            toast.tone === 'error' && 'bg-red-50 border-red-200 text-red-800',
            toast.tone === 'info' && 'bg-sky-50 border-sky-200 text-sky-800',
          )}
        >
          {toast.tone === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
          {toast.tone === 'info' && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
          {toast.tone === 'error' && <XCircle className="w-5 h-5 shrink-0 mt-0.5" />}
          <div className="text-sm font-medium">{toast.message}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="候补预约数"
          value={waitingRecords.length}
          accent="from-amber-500 to-orange-500"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="候补总人数"
          value={totalWaitingPeople}
          accent="from-purple-500 to-fuchsia-500"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="涉及批次"
          value={batchesWithWaiting}
          accent="from-sky-500 to-blue-500"
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      {waitingByBatch.length === 0 ? (
        <div className="card py-20">
          <div className="text-center text-slate-400">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <div className="text-lg font-medium mb-1">暂无候补预约</div>
            <div className="text-sm">当前所有批次容量充足，或暂未产生超额预约。</div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">{waitingByBatch.map(renderBatchGroup)}</div>
      )}
    </div>
  )
}
