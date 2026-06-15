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
  Car,
  Smartphone,
  Printer,
  ShieldCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  MapPin,
  UserCheck,
  XCircle,
  FileText,
  RefreshCw,
  Gift,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  BadgeCheck,
  UserX,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle, PageActions } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Alert from '@/components/Alert'
import { statusBadge, formatDateTime, todayStr, maskPhone, cn } from '@/lib/utils'
import type { VisitRecord, VisitBatch, StaffMember, ParkingSpace, Visitor } from '@/types'

type ReceptionStage = 'parking' | 'badge' | 'phone_seal' | 'security' | 'material' | 'complete'

interface StageConfig {
  key: ReceptionStage
  title: string
  description: string
  icon: React.ReactNode
  color: string
}

const STAGES: StageConfig[] = [
  { key: 'parking', title: '车位确认', description: '确认访客车位预留和车辆信息', icon: <Car className="w-5 h-5" />, color: 'bg-blue-500' },
  { key: 'badge', title: '胸卡打印', description: '批量打印访客胸卡', icon: <Printer className="w-5 h-5" />, color: 'bg-purple-500' },
  { key: 'phone_seal', title: '手机封存', description: '涉密路线需封存手机', icon: <Smartphone className="w-5 h-5" />, color: 'bg-amber-500' },
  { key: 'security', title: '安保核验', description: '身份核验和安全检查', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-red-500' },
  { key: 'material', title: '物料领取', description: '宣传册、样品、安全背心等', icon: <Gift className="w-5 h-5" />, color: 'bg-emerald-500' },
  { key: 'complete', title: '完成入场', description: '所有环节完成，可入馆', icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-teal-500' },
]

export default function ReceptionWorkbench() {
  const records = useAppStore((s) => s.records)
  const batches = useAppStore((s) => s.batches)
  const staff = useAppStore((s) => s.staff)
  const parkingSpaces = useAppStore((s) => s.parkingSpaces)
  const routes = useAppStore((s) => s.routes)
  
  const checkIn = useAppStore((s) => s.checkIn)
  const printBadges = useAppStore((s) => s.printBadges)
  const sealPhones = useAppStore((s) => s.sealPhones)
  const collectSample = useAppStore((s) => s.collectSample)
  const securityClear = useAppStore((s) => s.securityClear)
  const reserveParkingSpace = useAppStore((s) => s.reserveParkingSpace)
  const releaseParkingSpace = useAppStore((s) => s.releaseParkingSpace)
  const getRecordParkingSpace = useAppStore((s) => s.getRecordParkingSpace)
  const getBatchStaffAssignment = useAppStore((s) => s.calculateBatchStaff)
  const getBatchMaterials = useAppStore((s) => s.calculateBatchMaterials)
  const collectMaterials = useAppStore((s) => s.collectMaterials)
  const currentUser = useAppStore((s) => s.currentUser)

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<ReceptionStage>('parking')
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set())
  const [alert, setAlert] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null)
  const [selectedVisitors, setSelectedVisitors] = useState<Set<string>>(new Set())

  const today = todayStr()

  const todayBatches = useMemo(() => {
    return batches.filter(b => b.date === today && b.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [batches, today])

  const selectedBatch = useMemo(() => {
    return selectedBatchId ? batches.find(b => b.id === selectedBatchId) : undefined
  }, [batches, selectedBatchId])

  const batchRecords = useMemo(() => {
    if (!selectedBatchId) return []
    return records.filter(r => 
      r.batchId === selectedBatchId && 
      !['cancelled', 'rejected', 'waiting_list'].includes(r.status)
    )
  }, [records, selectedBatchId])

  const batchRoute = useMemo(() => {
    return selectedBatch ? routes.find(r => r.id === selectedBatch.routeId) : undefined
  }, [selectedBatch, routes])

  const batchStaff = useMemo(() => {
    if (!selectedBatch) return undefined
    const assignment = selectedBatch.staffAssignment || getBatchStaffAssignment(selectedBatch.id, 'update')
    return {
      reception: staff.filter(s => assignment.receptionStaffIds.includes(s.id)),
      security: staff.filter(s => assignment.securityStaffIds.includes(s.id)),
      guide: staff.find(s => s.id === assignment.guideId),
    }
  }, [selectedBatch, staff, getBatchStaffAssignment])

  const batchMaterials = useMemo(() => {
    if (!selectedBatch) return undefined
    return selectedBatch.materialPreparation || getBatchMaterials(selectedBatch.id)
  }, [selectedBatch, getBatchMaterials])

  const availableParking = useMemo(() => {
    return parkingSpaces.filter(p => p.status === 'available')
  }, [parkingSpaces])

  const showAlert = (tone: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setAlert({ tone, message })
    setTimeout(() => setAlert(null), 3000)
  }

  const toggleRecordExpand = (recordId: string) => {
    setExpandedRecords(prev => {
      const next = new Set(prev)
      if (next.has(recordId)) {
        next.delete(recordId)
      } else {
        next.add(recordId)
      }
      return next
    })
  }

  const toggleVisitorSelect = (visitorId: string) => {
    setSelectedVisitors(prev => {
      const next = new Set(prev)
      if (next.has(visitorId)) {
        next.delete(visitorId)
      } else {
        next.add(visitorId)
      }
      return next
    })
  }

  const selectAllVisitors = (visitors: Visitor[]) => {
    if (selectedVisitors.size === visitors.length) {
      setSelectedVisitors(new Set())
    } else {
      setSelectedVisitors(new Set(visitors.map(v => v.id)))
    }
  }

  const getPrimaryVisitor = (record: VisitRecord) => {
    return record.visitors.find((v) => v.isPrimary) || record.visitors[0]
  }

  const getRecordStage = (record: VisitRecord): ReceptionStage => {
    if (record.status === 'checked_out') return 'complete'
    if (record.materials.every(m => m.collectedAt)) return 'complete'
    if (record.securityCleared) return 'material'
    if (record.phoneBatchSealed) return 'security'
    if (record.badgeBatchPrinted) return 'phone_seal'
    if (record.checkInAt) return 'badge'
    return 'parking'
  }

  const isStageComplete = (record: VisitRecord, stage: ReceptionStage): boolean => {
    const recordStage = getRecordStage(record)
    const stageOrder: ReceptionStage[] = ['parking', 'badge', 'phone_seal', 'security', 'material', 'complete']
    return stageOrder.indexOf(recordStage) > stageOrder.indexOf(stage)
  }

  const handleCheckIn = (record: VisitRecord) => {
    const result = checkIn(record.id, currentUser)
    if (result.success) {
      showAlert('success', `${record.companyName} ${record.totalPeople}人签到成功！`)
      if (batchRoute?.requiresNda) {
        showAlert('info', '涉密路线，请先完成NDA签署再进行后续操作')
      }
    } else {
      showAlert('error', result.message || '签到失败')
    }
  }

  const handlePrintBadges = (record: VisitRecord) => {
    const success = printBadges(record.id, currentUser)
    if (success) {
      showAlert('success', `已打印 ${record.visitors.length} 张胸卡`)
    }
  }

  const handleSealPhones = (record: VisitRecord) => {
    const success = sealPhones(record.id, currentUser)
    if (success) {
      showAlert('success', `已封存 ${record.visitors.length} 台手机`)
    }
  }

  const handleSecurityClear = (record: VisitRecord) => {
    securityClear(record.id, currentUser)
    showAlert('success', '安保核验通过')
  }

  const handleCollectAllMaterials = (record: VisitRecord) => {
    const uncollected = record.materials.filter(m => !m.collectedAt).map(m => m.id)
    if (uncollected.length > 0) {
      collectMaterials(record.id, currentUser, uncollected)
      showAlert('success', `已发放 ${uncollected.length} 项物料`)
    }
  }

  const handleReserveParking = (record: VisitRecord) => {
    if (!record.vehicle?.plateNumber) {
      showAlert('error', '请先完善车辆信息')
      return
    }
    const space = reserveParkingSpace(record.id, record.vehicle.plateNumber)
    if (space) {
      showAlert('success', `已预留车位：${space.code}（${space.location}）`)
    } else {
      showAlert('error', '暂无可用车位')
    }
  }

  const handleReleaseParking = (spaceId: string) => {
    releaseParkingSpace(spaceId)
    showAlert('info', '车位已释放')
  }

  const handleCollectSampleForVisitor = (recordId: string, visitorId: string) => {
    collectSample(recordId, visitorId, currentUser)
    showAlert('success', '样品已领取')
  }

  const renderBatchCard = (batch: VisitBatch) => {
    const isSelected = batch.id === selectedBatchId
    const batchUsed = records.filter(r => r.batchId === batch.id && !['cancelled', 'rejected', 'waiting_list'].includes(r.status))
      .reduce((sum, r) => sum + r.totalPeople, 0)
    const route = routes.find(r => r.id === batch.routeId)

    return (
      <div
        key={batch.id}
        onClick={() => setSelectedBatchId(batch.id)}
        className={cn(
          'p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md',
          isSelected
            ? 'border-brand-500 bg-brand-50/50 shadow-md'
            : 'border-transparent bg-white hover:border-brand-200'
        )}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {batch.code}
              </span>
              <span className={statusBadge(batch.status).className}>
                {statusBadge(batch.status).label}
              </span>
              {route?.requiresNda && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  涉密
                </span>
              )}
            </div>
            <h4 className="font-semibold text-slate-800 truncate">{batch.name}</h4>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-brand-600 tabular-nums">
              {batchUsed}/{batch.capacity}
            </div>
            <div className="text-xs text-slate-500">人</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {batch.startTime}-{batch.endTime}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {route?.name}
          </span>
        </div>
      </div>
    )
  }

  const renderVisitorRow = (visitor: Visitor, recordId: string, index: number) => {
    const isSelected = selectedVisitors.has(visitor.id)
    const foreignConfig = visitor.isForeign && visitor.nationality 
      ? useAppStore.getState().getForeignConfig(visitor.nationality)
      : null

    return (
      <tr key={visitor.id} className={cn(
        'border-b border-slate-100 last:border-0 hover:bg-slate-50',
        isSelected && 'bg-brand-50/50'
      )}>
        <td className="py-2.5 px-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleVisitorSelect(visitor.id)}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
          />
        </td>
        <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums">{index + 1}</td>
        <td className="py-2.5 px-3 font-medium text-slate-800">
          <div className="flex items-center gap-2">
            {visitor.name}
            {visitor.isPrimary && (
              <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">主</span>
            )}
            {visitor.isForeign && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <span>{visitor.nationality}</span>
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3 text-slate-600 text-sm">{visitor.idType}</td>
        <td className="py-2.5 px-3 font-mono text-slate-600 text-sm">
          {visitor.idNumber.slice(0, 4)}****{visitor.idNumber.slice(-4)}
        </td>
        <td className="py-2.5 px-3 tabular-nums text-slate-600 text-sm">{visitor.phone}</td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1.5">
            {visitor.badgePrinted ? (
              <span className="text-emerald-600 text-xs flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5" />
                已打印
              </span>
            ) : (
              <span className="text-slate-400 text-xs">未打印</span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1.5">
            {visitor.phoneSealed ? (
              <span className="text-amber-600 text-xs flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                已封存
                {visitor.phoneSealBagCode && <span className="font-mono">({visitor.phoneSealBagCode})</span>}
              </span>
            ) : (
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" />
                未封存
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1.5">
            {visitor.sampleCollected ? (
              <span className="text-emerald-600 text-xs flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" />
                已领
              </span>
            ) : (
              <button
                onClick={() => handleCollectSampleForVisitor(recordId, visitor.id)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                发放样品
              </button>
            )}
          </div>
        </td>
        {foreignConfig && (
          <td className="py-2.5 px-3">
            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
              需{foreignConfig.approvalRequirement === 'ministry' ? '部委' : 
                 foreignConfig.approvalRequirement === 'ceo' ? 'CEO' :
                 foreignConfig.approvalRequirement === 'director' ? '总监' : '经理'}审批
            </span>
          </td>
        )}
      </tr>
    )
  }

  const renderRecordCard = (record: VisitRecord) => {
    const isExpanded = expandedRecords.has(record.id)
    const primary = getPrimaryVisitor(record)
    const badge = statusBadge(record.status)
    const parkingSpace = getRecordParkingSpace(record.id)
    const currentStage = getRecordStage(record)
    const hasSecretZone = record.hasSecretZone
    const allBadgesPrinted = record.badgeBatchPrinted
    const allPhonesSealed = record.phoneBatchSealed
    const allMaterialsCollected = record.materials.every(m => m.collectedAt)

    return (
      <div key={record.id} className="card p-4 mb-4">
        <div
          className="flex items-start justify-between gap-4 cursor-pointer"
          onClick={() => toggleRecordExpand(record.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {record.code}
              </span>
              <span className={badge.className}>{badge.label}</span>
              {hasSecretZone && (
                <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  涉密
                </span>
              )}
              {record.visitorCategory && record.visitorCategory !== 'internal' && (
                <span className={cn(
                  'badge',
                  record.visitorCategory === 'blacklist' ? 'bg-red-100 text-red-700' :
                  record.visitorCategory === 'foreign' ? 'bg-blue-100 text-blue-700' :
                  record.visitorCategory === 'external_partner' ? 'bg-purple-100 text-purple-700' :
                  'bg-emerald-100 text-emerald-700'
                )}>
                  {record.visitorCategory === 'blacklist' ? '黑名单' :
                   record.visitorCategory === 'foreign' ? '外籍' :
                   record.visitorCategory === 'external_partner' ? '合作单位' :
                   record.visitorCategory === 'vip' ? 'VIP' : '内部'}
                </span>
              )}
            </div>
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              {record.companyName}
              <span className="text-slate-400 font-normal">· {record.totalPeople}人</span>
            </h4>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                {primary?.name}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {maskPhone(record.contactPhone)}
              </span>
              {parkingSpace && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Car className="w-3.5 h-3.5" />
                  {parkingSpace.code}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1">
              {STAGES.map((stage) => (
                <div
                  key={stage.key}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    isStageComplete(record, stage.key)
                      ? stage.color
                      : currentStage === stage.key
                        ? 'bg-brand-500 animate-pulse'
                        : 'bg-slate-200'
                  )}
                  title={stage.title}
                />
              ))}
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={(e) => { e.stopPropagation(); handleCheckIn(record); }}
                disabled={!!record.checkInAt}
                className={cn(
                  'btn-primary text-sm py-2',
                  !!record.checkInAt && 'opacity-50 cursor-not-allowed'
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                {record.checkInAt ? '已签到' : '签到'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrintBadges(record); }}
                disabled={allBadgesPrinted || !record.checkInAt}
                className={cn(
                  'btn-secondary text-sm py-2',
                  (allBadgesPrinted || !record.checkInAt) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Printer className="w-4 h-4" />
                {allBadgesPrinted ? '已打印胸卡' : '打印胸卡'}
              </button>
              {hasSecretZone && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSealPhones(record); }}
                  disabled={allPhonesSealed || !record.checkInAt}
                  className={cn(
                    'btn-secondary text-sm py-2',
                    (allPhonesSealed || !record.checkInAt) && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Lock className="w-4 h-4" />
                  {allPhonesSealed ? '已封存手机' : '封存手机'}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleSecurityClear(record); }}
                disabled={record.securityCleared || !record.checkInAt}
                className={cn(
                  'btn-secondary text-sm py-2',
                  (record.securityCleared || !record.checkInAt) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <ShieldCheck className="w-4 h-4" />
                {record.securityCleared ? '已核验' : '安保核验'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCollectAllMaterials(record); }}
                disabled={allMaterialsCollected || !record.securityCleared}
                className={cn(
                  'btn-success text-sm py-2',
                  (allMaterialsCollected || !record.securityCleared) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Gift className="w-4 h-4" />
                {allMaterialsCollected ? '物料已发完' : '发放全部物料'}
              </button>
              {!parkingSpace && record.vehicle && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleReserveParking(record); }}
                  className="btn-secondary text-sm py-2"
                >
                  <Car className="w-4 h-4" />
                  预留车位
                </button>
              )}
              {parkingSpace && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleReleaseParking(parkingSpace.id); }}
                  className="btn-secondary text-sm py-2"
                >
                  <Car className="w-4 h-4" />
                  释放车位
                </button>
              )}
            </div>

            {record.additionalApprovalRequired && (
              <Alert tone="warning" dismissible={false}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-800">需追加审批</div>
                    <div className="text-sm text-amber-700">
                      {record.additionalApprovalReason || '该预约需要额外审批'}
                      {record.additionalApprovalStatus === 'pending' && ' · 审批中'}
                      {record.additionalApprovalStatus === 'approved' && ' · 已通过'}
                      {record.additionalApprovalStatus === 'rejected' && ' · 已拒绝'}
                    </div>
                  </div>
                </div>
              </Alert>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  访客名单 ({record.visitors.length}人)
                </h5>
                <button
                  onClick={(e) => { e.stopPropagation(); selectAllVisitors(record.visitors); }}
                  className="text-xs text-brand-600 hover:text-brand-700"
                >
                  {selectedVisitors.size === record.visitors.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 text-xs">
                    <tr>
                      <th className="py-2 px-3 text-left w-8"></th>
                      <th className="py-2 px-3 text-center w-12">#</th>
                      <th className="py-2 px-3 text-left">姓名</th>
                      <th className="py-2 px-3 text-left">证件类型</th>
                      <th className="py-2 px-3 text-left">证件号</th>
                      <th className="py-2 px-3 text-left">手机号</th>
                      <th className="py-2 px-3 text-center">胸卡</th>
                      <th className="py-2 px-3 text-center">手机</th>
                      <th className="py-2 px-3 text-center">样品</th>
                      {(record.visitors.some(v => v.isForeign)) && (
                        <th className="py-2 px-3 text-center">审批</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {record.visitors.map((v, i) => renderVisitorRow(v, record.id, i))}
                  </tbody>
                </table>
              </div>
            </div>

            {record.vehicle && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <h5 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  车辆信息
                </h5>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">车牌号：</span>
                    <span className="font-mono font-medium">{record.vehicle.plateNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">车型：</span>
                    <span>{record.vehicle.vehicleType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">司机：</span>
                    <span>{record.vehicle.driverName}</span>
                  </div>
                </div>
                {parkingSpace && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-sm">
                    <span className="text-slate-500">预留车位：</span>
                    <span className="font-medium text-blue-600">
                      {parkingSpace.code}（{parkingSpace.location}）
                    </span>
                    {record.vehicle.plateNumber && (
                      <span className="ml-2 text-slate-500">
                        车牌：{record.vehicle.plateNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-lg">
              <h5 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                物料清单
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {record.materials.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      'p-3 rounded-lg border text-sm',
                      m.collectedAt
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-slate-200'
                    )}
                  >
                    <div className="font-medium text-slate-800">{m.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      数量：<span className="font-semibold">{m.quantity}</span>
                    </div>
                    {m.collectedAt && (
                      <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        已领取
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          title="接待工作台"
          desc="一站式处理接待全流程：车位、胸卡、手机封存、安保核验、物料发放"
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="今日批次"
          value={todayBatches.length}
          accent="from-brand-500 to-indigo-600"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="待签到"
          value={batchRecords.filter(r => !r.checkInAt).length}
          accent="from-amber-500 to-orange-500"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="在馆中"
          value={batchRecords.filter(r => r.checkInAt && r.status !== 'checked_out').length}
          accent="from-emerald-500 to-teal-500"
          icon={<UserCheck className="w-5 h-5" />}
        />
        <StatCard
          title="可用车位"
          value={availableParking.length}
          accent="from-blue-500 to-sky-600"
          icon={<Car className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <div className="card p-4">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              今日批次
            </h3>
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {todayBatches.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">今日暂无批次</div>
                </div>
              ) : (
                todayBatches.map(renderBatchCard)
              )}
            </div>
          </div>

          {selectedBatch && batchStaff && (
            <div className="card p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-600" />
                工作人员
              </h3>
              <div className="space-y-4">
                {batchStaff.guide && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1.5">讲解员</div>
                    <div className="flex items-center gap-2 p-2 bg-sky-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-sm">
                        {batchStaff.guide.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 text-sm">{batchStaff.guide.name}</div>
                        <div className="text-xs text-slate-500">{batchStaff.guide.title}</div>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">
                    接待员 ({batchStaff.reception.length}人)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {batchStaff.reception.map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 rounded-full text-sm">
                        <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xs">
                          {s.name[0]}
                        </div>
                        <span className="text-slate-700">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1.5">
                    安保人员 ({batchStaff.security.length}人)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {batchStaff.security.map((s) => (
                      <div key={s.id} className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-full text-sm">
                        <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-xs">
                          {s.name[0]}
                        </div>
                        <span className="text-slate-700">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedBatch && batchMaterials && (
            <div className="card p-4">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-600" />
                批次物料准备
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 text-xs">胸卡</div>
                  <div className="font-bold text-lg">{batchMaterials.badgeCount}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 text-xs">宣传册</div>
                  <div className="font-bold text-lg">{batchMaterials.brochureCount}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 text-xs">环保袋</div>
                  <div className="font-bold text-lg">{batchMaterials.bagCount}</div>
                </div>
                {batchMaterials.sampleCount > 0 && (
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-500 text-xs">样品</div>
                    <div className="font-bold text-lg">{batchMaterials.sampleCount}</div>
                  </div>
                )}
                {batchMaterials.safetyVestCount > 0 && (
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-500 text-xs">安全背心</div>
                    <div className="font-bold text-lg">{batchMaterials.safetyVestCount}</div>
                  </div>
                )}
                {batchMaterials.phoneBagCount > 0 && (
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <div className="text-slate-500 text-xs">封存袋</div>
                    <div className="font-bold text-lg">{batchMaterials.phoneBagCount}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedBatch ? (
            <div className="space-y-4">
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {selectedBatch.code}
                      </span>
                      <span className={statusBadge(selectedBatch.status).className}>
                        {statusBadge(selectedBatch.status).label}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedBatch.name}</h3>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedBatchId) {
                        getBatchStaffAssignment(selectedBatchId, 'update')
                        getBatchMaterials(selectedBatchId)
                        showAlert('success', '已重新计算人员和物料')
                      }
                    }}
                    className="btn-secondary text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重算人员/物料
                  </button>
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-600 mb-4 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-brand-600" />
                    {selectedBatch.startTime} - {selectedBatch.endTime}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    {batchRoute?.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-brand-600" />
                    {batchRecords.reduce((sum, r) => sum + r.totalPeople, 0)}/{selectedBatch.capacity} 人
                  </span>
                  {batchRoute?.requiresNda && (
                    <span className="flex items-center gap-1.5 text-red-600">
                      <ShieldAlert className="w-4 h-4" />
                      涉密路线 · 需NDA
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {STAGES.map((stage) => (
                    <button
                      key={stage.key}
                      onClick={() => setActiveStage(stage.key)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                        activeStage === stage.key
                          ? `${stage.color} text-white`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      {stage.icon}
                      {stage.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {batchRecords.length === 0 ? (
                  <div className="card p-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <div className="text-lg font-medium">该批次暂无预约</div>
                    <div className="text-sm mt-1">等待访客提交预约申请</div>
                  </div>
                ) : (
                  batchRecords.map(renderRecordCard)
                )}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">请选择批次</h3>
              <p className="text-slate-500 text-sm">从左侧列表选择一个批次查看详情和进行接待操作</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
