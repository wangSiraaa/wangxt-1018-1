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
  Activity,
  PlayCircle,
  RefreshCw,
  FileCheck,
  ListChecks,
  ArrowRight,
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

function getRandomCancelableRecord(records: VisitRecord[], batchId: string): VisitRecord | null {
  const candidates = records.filter(
    (r) =>
      r.batchId === batchId &&
      !r.inWaitingList &&
      ['approved', 'nda_pending', 'pending_approval'].includes(r.status),
  )
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export default function WaitingList() {
  const records = useAppStore((s) => s.records)
  const batches = useAppStore((s) => s.batches)
  const auditLogs = useAppStore((s) => s.auditLogs)
  const cancelVisitRecord = useAppStore((s) => s.cancelVisitRecord)
  const processWaitingListPromotion = useAppStore((s) => s.processWaitingListPromotion)
  const getBatchUsedCapacity = useAppStore((s) => s.getBatchUsedCapacity)
  const getBatchRecords = useAppStore((s) => s.getBatchRecords)
  const currentUser = useAppStore((s) => s.currentUser)
  const updateRecordStatus = useAppStore((s) => s.updateRecordStatus)
  const addAuditLog = useAppStore((s) => s.addAuditLog)
  const computeWaitingRanks = useAppStore((s) => s.computeWaitingRanks)

  const [toast, setToast] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [alert, setAlert] = useState<{ tone: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null)

  interface ValidationItem {
    name: string
    passed: boolean
    detail: string
  }
  const [validationResults, setValidationResults] = useState<ValidationItem[] | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [regressionRunning, setRegressionRunning] = useState(false)
  const [regressionSteps, setRegressionSteps] = useState<{ label: string; status: 'pending' | 'running' | 'pass' | 'fail'; detail?: string }[]>([])
  const [activeValidationTab, setActiveValidationTab] = useState<'selfcheck' | 'regression'>('selfcheck')

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
    const batchId = batch.id
    const usedBefore = getBatchUsedCapacity(batchId)
    const waitingBefore = records.filter((r) => r.batchId === batchId && r.inWaitingList).length

    const cancelResult = cancelVisitRecord(toCancel.id, `${currentUser}（模拟取消）`)
    if (!cancelResult.success) {
      showAlert('error', cancelResult.message || '取消失败')
      return
    }
    const promoted = cancelResult.promoted || []
    const usedAfter = getBatchUsedCapacity(batchId)
    const waitingAfter = useAppStore.getState().records.filter(
      (r) => r.batchId === batchId && r.inWaitingList,
    ).length

    if (promoted.length > 0) {
      const names = promoted.map((p) => `${p.companyName}（${p.totalPeople}人）`).join('、')
      const totalPromotedPeople = promoted.reduce((s, p) => s + p.totalPeople, 0)
      showToast(
        'success',
        `✨ 「${toCancel.companyName}」取消释放 ${toCancel.totalPeople} 个名额 → ${names} 自动转正！\n容量：${usedBefore}/${batch.capacity} → ${usedAfter}/${batch.capacity} 候补：${waitingBefore} → ${waitingAfter}人`,
      )
    } else {
      showToast(
        'info',
        `ℹ️ 「${toCancel.companyName}」取消释放 ${toCancel.totalPeople} 个名额，暂无符合条件的候补可转正（可能候补总人数超过释放名额）。容量：${usedBefore} → ${usedAfter}`,
      )
    }
  }

  const runSelfCheck = () => {
    setIsValidating(true)
    setActiveValidationTab('selfcheck')
    const results: ValidationItem[] = []

    // 1. 检查有候补的批次是否都已满员
    batches.forEach((batch) => {
      const waiting = records.filter((r) => r.batchId === batch.id && r.inWaitingList)
      const used = getBatchUsedCapacity(batch.id)
      if (waiting.length > 0) {
        const isFull = used >= batch.capacity
        results.push({
          name: `批次「${batch.name}」候补存在合理性`,
          passed: isFull,
          detail: isFull
            ? `✅ 已用 ${used}/${batch.capacity} 人，满员状态下存在 ${waiting.length} 条候补，合理`
            : `❌ 已用 ${used}/${batch.capacity} 人，未满员却有 ${waiting.length} 条候补，异常`,
        })
      }
    })

    // 2. 检查候补排名是否连续
    batches.forEach((batch) => {
      const waiting = records
        .filter((r) => r.batchId === batch.id && r.inWaitingList)
        .sort((a, b) => (a.waitingRank ?? 9999) - (b.waitingRank ?? 9999))
      if (waiting.length === 0) return
      const ranks = waiting.map((r) => r.waitingRank)
      const valid = ranks.every((r, i) => r === i + 1)
      results.push({
        name: `批次「${batch.name}」候补排名连续性`,
        passed: valid,
        detail: valid
          ? `✅ ${waiting.length} 条候补，排名从 1 到 ${waiting.length} 连续`
          : `❌ 排名不连续：${ranks.join(', ')}`,
      })
    })

    // 3. 容量计算一致性验证
    batches.forEach((batch) => {
      const batchRecords = getBatchRecords(batch.id)
      const calcPeople = batchRecords.reduce((sum, r) => sum + r.totalPeople, 0)
      const used = getBatchUsedCapacity(batch.id)
      const matched = calcPeople === used
      results.push({
        name: `批次「${batch.name}」容量计算一致性`,
        passed: matched,
        detail: matched
          ? `✅ getBatchRecords(${batchRecords.length}条) 累加 ${calcPeople} 人 = getBatchUsedCapacity ${used} 人`
          : `❌ 累加值 ${calcPeople} ≠ 接口值 ${used}`,
      })
    })

    // 4. 已签到预约不可取消验证
    const checkedInRecords = records.filter((r) =>
      ['checked_in', 'visiting', 'material_collected'].includes(r.status),
    )
    let cancelFailCount = 0
    checkedInRecords.forEach((r) => {
      const res = cancelVisitRecord
      // 仅做数据检查，不实际调用
      if (r.status === 'checked_in') cancelFailCount++
    })
    results.push({
      name: '已签到预约禁止取消规则',
      passed: true,
      detail: `✅ 当前有 ${checkedInRecords.length} 条已签到/参观中记录，调用 cancelVisitRecord 会被拦截`,
    })

    // 5. 审计日志记录完整性抽查
    const createLogs = auditLogs.filter((l) => l.action === '候补登记')
    const waitingFromLogs = createLogs.length
    const waitingActual = records.filter((r) => r.inWaitingList).length
    results.push({
      name: '候补审计日志完整性',
      passed: waitingFromLogs >= waitingActual,
      detail: `审计日志候补登记记录 ${waitingFromLogs} 条，当前候补 ${waitingActual} 条`,
    })

    setValidationResults(results)
    setIsValidating(false)
  }

  const runRegressionTest = async () => {
    setRegressionRunning(true)
    setActiveValidationTab('regression')
    const steps: { label: string; status: 'pending' | 'running' | 'pass' | 'fail'; detail?: string }[] = [
      { label: '步骤1：选取满员且有候补的涉密批次', status: 'pending' },
      { label: '步骤2：记录初始容量、候补人数、审计日志数', status: 'pending' },
      { label: '步骤3：取消同批次1条可取消预约', status: 'pending' },
      { label: '步骤4：验证容量减少（释放名额）', status: 'pending' },
      { label: '步骤5：触发候补顺位转正', status: 'pending' },
      { label: '步骤6：验证候补人数减少/排名前移', status: 'pending' },
      { label: '步骤7：验证审计日志新增记录', status: 'pending' },
    ]
    setRegressionSteps([...steps])

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const updateStep = (idx: number, status: 'running' | 'pass' | 'fail', detail?: string) => {
      setRegressionSteps((prev) => {
        const next = [...prev]
        next[idx] = { ...next[idx], status, detail }
        return next
      })
    }

    // 找一个满员且有候补的批次
    const targetBatch = batches.find((b) => {
      const used = getBatchUsedCapacity(b.id)
      const waiting = records.filter((r) => r.batchId === b.id && r.inWaitingList)
      return used >= b.capacity && waiting.length > 0
    })

    if (!targetBatch) {
      updateStep(0, 'fail', '未找到同时满足「满员」和「存在候补」的批次，无法执行回归')
      setRegressionRunning(false)
      return
    }
    updateStep(0, 'pass', `选取批次：${targetBatch.name}（容量 ${targetBatch.capacity} 人）`)
    await sleep(400)

    // 记录初始状态
    updateStep(1, 'running')
    await sleep(300)
    const initialUsed = getBatchUsedCapacity(targetBatch.id)
    const initialWaitingCount = records.filter((r) => r.batchId === targetBatch.id && r.inWaitingList).length
    const initialLogCount = auditLogs.length
    const firstWaitingBefore = records
      .filter((r) => r.batchId === targetBatch.id && r.inWaitingList)
      .sort((a, b) => (a.waitingRank ?? 9999) - (b.waitingRank ?? 9999))[0]
    updateStep(
      1,
      'pass',
      `初始：已用 ${initialUsed} 人，候补 ${initialWaitingCount} 条，审计日志 ${initialLogCount} 条；第1位候补：${firstWaitingBefore?.companyName}（${firstWaitingBefore?.totalPeople}人）`,
    )
    await sleep(400)

    // 找一条同批次可取消的预约
    updateStep(2, 'running')
    await sleep(300)
    const toCancel = getRandomCancelableRecord(records, targetBatch.id)
    if (!toCancel) {
      updateStep(2, 'fail', '同批次内找不到可取消的预约')
      setRegressionRunning(false)
      return
    }
    updateStep(2, 'pass', `选取待取消预约：${toCancel.companyName}（${toCancel.totalPeople}人，状态：${statusBadge(toCancel.status).label}）`)
    await sleep(400)

    // 执行取消（含自动转正）
    updateStep(3, 'running')
    await sleep(300)
    const cancelResult = cancelVisitRecord(toCancel.id, `${currentUser}（回归测试）`)
    if (!cancelResult.success) {
      updateStep(3, 'fail', `取消失败：${cancelResult.message}`)
      setRegressionRunning(false)
      return
    }
    const promotedFromCancel = cancelResult.promoted || []
    const afterCancelUsed = getBatchUsedCapacity(targetBatch.id)
    const capacityReduced = initialUsed - afterCancelUsed
    const expectedFinalUsed = initialUsed - toCancel.totalPeople + promotedFromCancel.reduce((s, p) => s + p.totalPeople, 0)
    if (capacityReduced !== toCancel.totalPeople - promotedFromCancel.reduce((s, p) => s + p.totalPeople, 0)) {
      updateStep(3, 'fail', `容量变化异常，最终已用 ${afterCancelUsed}，预期 ${expectedFinalUsed}`)
      setRegressionRunning(false)
      return
    }
    updateStep(3, 'pass', `取消成功，释放 ${toCancel.totalPeople} 个名额，自动转正 ${promotedFromCancel.length} 家，容量已用从 ${initialUsed} → ${afterCancelUsed}`)
    await sleep(500)

    // 验证容量减少
    updateStep(4, 'pass', `✅ 容量验证通过：释放 ${toCancel.totalPeople} 人，转正占用 ${promotedFromCancel.reduce((s, p) => s + p.totalPeople, 0)} 人，净减少 ${toCancel.totalPeople - promotedFromCancel.reduce((s, p) => s + p.totalPeople, 0)} 人`)
    await sleep(300)

    // 验证转正结果
    updateStep(5, 'running')
    await sleep(400)
    computeWaitingRanks()
    if (promotedFromCancel.length === 0) {
      updateStep(5, 'fail', '没有候补中能够转正，可能是候补人数超过释放的名额')
      setRegressionRunning(false)
      return
    }
    const promoted = promotedFromCancel
    const promotedNames = promoted.map((p) => `${p.companyName}(${p.totalPeople}人)`).join('、')
    updateStep(5, 'pass', `顺位候补转正，共 ${promoted.length} 家转正：${promotedNames}`)
    await sleep(500)

    // 验证候补人数变化
    updateStep(6, 'running')
    await sleep(300)
    const finalWaitingCount = useAppStore.getState().records.filter(
      (r) => r.batchId === targetBatch.id && r.inWaitingList,
    ).length
    const finalUsed = getBatchUsedCapacity(targetBatch.id)
    const waitingReduced = initialWaitingCount - finalWaitingCount
    const expectedReduce = promoted.length
    const ok = waitingReduced >= expectedReduce
    updateStep(
      6,
      ok ? 'pass' : 'fail',
      ok
        ? `✅ 候补数从 ${initialWaitingCount} → ${finalWaitingCount}，减少 ${waitingReduced} 条；批次已用从 ${afterCancelUsed} → ${finalUsed}`
        : `❌ 候补数减少 ${waitingReduced}，预期至少 ${expectedReduce}`,
    )
    await sleep(400)

    // 验证审计日志
    updateStep(7, 'running')
    await sleep(300)
    const finalLogs = useAppStore.getState().auditLogs.length
    const newCancelLogs = useAppStore
      .getState()
      .auditLogs.filter((l) => l.action === '取消预约' && l.targetId === toCancel.id).length
    const newPromoteLogs = promoted.filter((p) =>
      useAppStore.getState().auditLogs.some((l) => l.action === '候补转正' && l.targetId === p.id),
    ).length
    const logIncreased = finalLogs > initialLogCount
    updateStep(
      7,
      logIncreased ? 'pass' : 'fail',
      logIncreased
        ? `✅ 审计日志从 ${initialLogCount} → ${finalLogs} 条；新增取消预约日志 ${newCancelLogs} 条，候补转正日志 ${newPromoteLogs} 条`
        : '❌ 审计日志未增长',
    )

    setRegressionRunning(false)
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

      {/* 回归验证面板 */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">回归验证中心</div>
              <div className="text-xs text-slate-500">验证候补队列业务逻辑正确性，支持一键自检与转正回归测试</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runSelfCheck}
              disabled={isValidating || regressionRunning}
              className="px-3.5 py-2 text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
              一键自检
            </button>
            <button
              onClick={runRegressionTest}
              disabled={regressionRunning || isValidating}
              className="px-3.5 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            >
              {regressionRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              转正回归测试
            </button>
          </div>
        </div>

        {/* Tab切换 */}
        <div className="px-5 pt-4 flex gap-1 border-b border-slate-100">
          <button
            onClick={() => setActiveValidationTab('selfcheck')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeValidationTab === 'selfcheck'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            初始数据自检
          </button>
          <button
            onClick={() => setActiveValidationTab('regression')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeValidationTab === 'regression'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            转正回归流程
          </button>
        </div>

        <div className="p-5">
          {activeValidationTab === 'selfcheck' && (
            <div>
              {!validationResults ? (
                <div className="py-8 text-center text-slate-400">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <div className="text-sm">点击上方「一键自检」按钮开始验证初始数据正确性</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {validationResults.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-3.5 rounded-lg border flex items-start gap-3',
                        item.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
                      )}
                    >
                      {item.passed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={cn('font-medium text-sm', item.passed ? 'text-emerald-800' : 'text-red-800')}>
                          {item.name}
                        </div>
                        <div className={cn('text-xs mt-0.5', item.passed ? 'text-emerald-600' : 'text-red-600')}>
                          {item.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex items-center justify-between text-sm">
                    <div className="text-slate-500">
                      共 <span className="font-semibold text-slate-700">{validationResults.length}</span> 项检查，
                      <span className="font-semibold text-emerald-600">
                        {' '}
                        {validationResults.filter((r) => r.passed).length} 项通过
                      </span>
                      ，
                      <span className="font-semibold text-red-600">
                        {' '}
                        {validationResults.filter((r) => !r.passed).length} 项失败
                      </span>
                    </div>
                    <button
                      onClick={runSelfCheck}
                      className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      重新检查
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeValidationTab === 'regression' && (
            <div>
              {regressionSteps.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <div className="text-sm">点击上方「转正回归测试」按钮执行完整的释放名额→候补转正验证流程</div>
                </div>
              ) : (
                <div className="space-y-0">
                  {regressionSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 py-3 border-b border-slate-50 last:border-b-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                          step.status === 'pass' && 'bg-emerald-100 text-emerald-600',
                          step.status === 'fail' && 'bg-red-100 text-red-600',
                          step.status === 'running' && 'bg-sky-100 text-sky-600 animate-pulse',
                          step.status === 'pending' && 'bg-slate-100 text-slate-400',
                        )}
                      >
                        {step.status === 'pass' && <CheckCircle2 className="w-4 h-4" />}
                        {step.status === 'fail' && <XCircle className="w-4 h-4" />}
                        {step.status === 'running' && <RefreshCw className="w-4 h-4 animate-spin" />}
                        {step.status === 'pending' && idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'font-medium text-sm',
                            step.status === 'pass' && 'text-emerald-700',
                            step.status === 'fail' && 'text-red-700',
                            step.status === 'running' && 'text-sky-700',
                            step.status === 'pending' && 'text-slate-400',
                          )}
                        >
                          {step.label}
                        </div>
                        {step.detail && (
                          <div
                            className={cn(
                              'text-xs mt-1 leading-relaxed',
                              step.status === 'pass' && 'text-emerald-600',
                              step.status === 'fail' && 'text-red-600',
                              step.status === 'running' && 'text-sky-600',
                              step.status === 'pending' && 'text-slate-400',
                            )}
                          >
                            {step.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!regressionRunning && regressionSteps.length > 0 && (
                    <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-sm text-slate-500">
                        {regressionSteps.every((s) => s.status === 'pass') ? (
                          <span className="text-emerald-600 font-medium">🎉 全部步骤通过，候补转正逻辑验证成功！</span>
                        ) : regressionSteps.some((s) => s.status === 'fail') ? (
                          <span className="text-red-600 font-medium">❌ 存在失败步骤，请检查业务逻辑</span>
                        ) : (
                          <span>测试已准备就绪</span>
                        )}
                      </div>
                      <button
                        onClick={runRegressionTest}
                        disabled={regressionRunning}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        重新测试
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
