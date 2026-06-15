import { useState, useMemo } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Building2,
  Phone,
  Car,
  QrCode,
  Clock,
  Trash2,
  Plus,
  X,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  UserPlus,
  CalendarDays,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn, todayStr, formatDateTime, maskId, maskPhone, statusBadge } from '@/lib/utils'
import { PageHeader, PageTitle } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Modal from '@/components/Modal'
import Alert from '@/components/Alert'
import type { VisitRecord, BlacklistCompany, ParkingSpace, StaffMember, ParkingStatus } from '@/types'

type TabKey = 'today' | 'pending' | 'parking' | 'staff' | 'blacklist'

const getParkingStatusIcon = (status: ParkingStatus) => {
  const icons = {
    available: CheckCircle2,
    reserved: Clock,
    occupied: Car,
    maintenance: AlertTriangle,
  }
  return icons[status]
}

const getParkingStatusLabel = (status: ParkingStatus) => {
  const labels = { available: '空闲', reserved: '已预留', occupied: '已占用', maintenance: '维护中' }
  return labels[status]
}

const getParkingStatusColor = (status: ParkingStatus) => {
  const colors = {
    available: 'bg-emerald-100 text-emerald-700',
    reserved: 'bg-amber-100 text-amber-700',
    occupied: 'bg-sky-100 text-sky-700',
    maintenance: 'bg-red-100 text-red-700',
  }
  return colors[status]
}

export default function SecurityList() {
  const records = useAppStore((s) => s.records)
  const blacklist = useAppStore((s) => s.blacklist)
  const currentUser = useAppStore((s) => s.currentUser)
  const securityClear = useAppStore((s) => s.securityClear)
  const addToBlacklist = useAppStore((s) => s.addToBlacklist)
  const removeFromBlacklist = useAppStore((s) => s.removeFromBlacklist)
  const parkingSpaces = useAppStore((s) => s.parkingSpaces)
  const staff = useAppStore((s) => s.staff)
  const batches = useAppStore((s) => s.batches)
  const reserveParkingSpace = useAppStore((s) => s.reserveParkingSpace)
  const releaseParkingSpace = useAppStore((s) => s.releaseParkingSpace)
  const getAvailableParkingSpaces = useAppStore((s) => s.getAvailableParkingSpaces)
  const getBatchSecurityList = useAppStore((s) => s.getBatchSecurityList)
  const calculateBatchStaff = useAppStore((s) => s.calculateBatchStaff)

  const [activeTab, setActiveTab] = useState<TabKey>('today')
  const [showAddBlacklistModal, setShowAddBlacklistModal] = useState(false)
  const [showReserveParkingModal, setShowReserveParkingModal] = useState(false)
  const [showStaffAssignModal, setShowStaffAssignModal] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [blacklistForm, setBlacklistForm] = useState({ companyName: '', reason: '', addedBy: currentUser })
  const [parkingForm, setParkingForm] = useState({ recordId: '', plateNumber: '' })
  const [parkingFilter, setParkingFilter] = useState<ParkingStatus | 'all'>('all')

  const todayCleared = useMemo(() => {
    const today = todayStr()
    return records.filter(
      (r) =>
        r.securityCleared &&
        !['cancelled', 'rejected'].includes(r.status) &&
        r.checkInAt &&
        r.checkInAt.slice(0, 10) === today,
    )
  }, [records])

  const pendingClear = useMemo(
    () =>
      records.filter(
        (r) =>
          !r.securityCleared &&
          !['cancelled', 'rejected', 'waiting_list'].includes(r.status),
      ),
    [records],
  )

  const activeBlacklist = useMemo(() => blacklist.filter((b) => b.active), [blacklist])

  const availableParking = useMemo(() => getAvailableParkingSpaces(), [getAvailableParkingSpaces])
  const reservedParking = useMemo(() => parkingSpaces.filter((p) => p.status === 'reserved'), [parkingSpaces])
  const occupiedParking = useMemo(() => parkingSpaces.filter((p) => p.status === 'occupied'), [parkingSpaces])

  const filteredParking = useMemo(() => {
    if (parkingFilter === 'all') return parkingSpaces
    return parkingSpaces.filter((p) => p.status === parkingFilter)
  }, [parkingSpaces, parkingFilter])

  const pendingCheckInRecords = useMemo(() => {
    const today = todayStr()
    return records.filter(
      (r) =>
        ['approved', 'additional_approval_required'].includes(r.status) &&
        r.visitDate.slice(0, 10) === today &&
        !r.parkingSpaceId,
    )
  }, [records])

  const securityStaff = useMemo(() => staff.filter((s) => s.role === 'security'), [staff])
  const receptionStaff = useMemo(() => staff.filter((s) => s.role === 'reception' || s.role === 'guide'), [staff])

  const activeBatches = useMemo(() => {
    const today = todayStr()
    return batches.filter((b) => b.visitDate.slice(0, 10) === today && b.status !== 'cancelled')
  }, [batches])

  const selectedBatchStaff = useMemo(() => {
    if (!selectedBatchId) return null
    return calculateBatchStaff(selectedBatchId, 'people_change')
  }, [selectedBatchId, calculateBatchStaff])

  const selectedBatchSecurityList = useMemo(() => {
    if (!selectedBatchId) return []
    return getBatchSecurityList(selectedBatchId)
  }, [selectedBatchId, getBatchSecurityList])

  const handleSecurityClear = (recordId: string) => {
    securityClear(recordId, currentUser)
    setAlertMsg({ type: 'success', text: '安保核验通过，已放行' })
    setTimeout(() => setAlertMsg(null), 3000)
  }

  const handleReserveParking = () => {
    if (!parkingForm.recordId || !parkingForm.plateNumber.trim()) {
      setAlertMsg({ type: 'error', text: '请选择预约记录并填写车牌号' })
      return
    }
    const result = reserveParkingSpace(parkingForm.recordId, parkingForm.plateNumber.trim())
    if (result) {
      setAlertMsg({ type: 'success', text: `车位已预留：${result.code}` })
      setShowReserveParkingModal(false)
      setParkingForm({ recordId: '', plateNumber: '' })
    } else {
      setAlertMsg({ type: 'error', text: '车位预留失败，暂无可用车位' })
    }
    setTimeout(() => setAlertMsg(null), 3000)
  }

  const handleReleaseParking = (spaceId: string, code: string) => {
    if (!confirm(`确认释放车位 ${code}？`)) return
    const success = releaseParkingSpace(spaceId)
    if (success) {
      setAlertMsg({ type: 'success', text: `车位 ${code} 已释放` })
    } else {
      setAlertMsg({ type: 'error', text: '车位释放失败' })
    }
    setTimeout(() => setAlertMsg(null), 3000)
  }

  const handleRecalculateStaff = (batchId: string) => {
    const result = calculateBatchStaff(batchId, 'people_change')
    setSelectedBatchId(batchId)
    setShowStaffAssignModal(true)
    setAlertMsg({
      type: 'success',
      text: `已重新计算：接待员${result.reception.length}人，安保${result.security.length}人`,
    })
    setTimeout(() => setAlertMsg(null), 3000)
  }

  const handleAddBlacklist = () => {
    if (!blacklistForm.companyName.trim() || !blacklistForm.reason.trim()) {
      setAlertMsg({ type: 'error', text: '请填写企业名称和原因' })
      return
    }
    addToBlacklist({
      companyName: blacklistForm.companyName.trim(),
      reason: blacklistForm.reason.trim(),
      addedBy: blacklistForm.addedBy || currentUser,
      active: true,
    })
    setShowAddBlacklistModal(false)
    setBlacklistForm({ companyName: '', reason: '', addedBy: currentUser })
    setAlertMsg({ type: 'success', text: '企业已加入黑名单' })
    setTimeout(() => setAlertMsg(null), 3000)
  }

  const handleRemoveBlacklist = (id: string, companyName: string) => {
    if (!confirm(`确认将「${companyName}」从黑名单中移除？`)) return
    removeFromBlacklist(id)
    setAlertMsg({ type: 'success', text: '已从黑名单移除' })
    setTimeout(() => setAlertMsg(null), 3000)
  }

  const tabs = [
    { key: 'today' as TabKey, label: '今日放行', icon: ShieldCheck, count: todayCleared.length },
    { key: 'pending' as TabKey, label: '待核验', icon: Shield, count: pendingClear.length },
    { key: 'parking' as TabKey, label: '车位管理', icon: Car, count: reservedParking.length + occupiedParking.length },
    { key: 'staff' as TabKey, label: '人员排班', icon: Users, count: activeBatches.length },
    { key: 'blacklist' as TabKey, label: '黑名单', icon: ShieldAlert, count: activeBlacklist.length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          title="安保名单管理"
          desc="管理访客安保核验、黑名单企业管控与放行记录"
        />
      </PageHeader>

      {alertMsg && (
        <Alert
          tone={alertMsg.type}
          onClose={() => setAlertMsg(null)}
          dismissible
        >
          {alertMsg.text}
        </Alert>
      )}

      <div className="grid grid-cols-6 gap-4">
        <StatCard
          label="今日已放行"
          value={todayCleared.length}
          icon={<ShieldCheck className="w-5 h-5" />}
          tone="emerald"
        />
        <StatCard
          label="待核验"
          value={pendingClear.length}
          icon={<Shield className="w-5 h-5" />}
          tone="amber"
        />
        <StatCard
          label="可用车位"
          value={availableParking.length}
          icon={<Car className="w-5 h-5" />}
          tone="sky"
        />
        <StatCard
          label="已用车位"
          value={reservedParking.length + occupiedParking.length}
          icon={<MapPin className="w-5 h-5" />}
          tone="slate"
        />
        <StatCard
          label="安保人员"
          value={securityStaff.length}
          icon={<Shield className="w-5 h-5" />}
          tone="purple"
        />
        <StatCard
          label="黑名单企业"
          value={activeBlacklist.length}
          icon={<ShieldAlert className="w-5 h-5" />}
          tone="red"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex">
            {tabs.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors -mb-px',
                    active
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  {t.count > 0 && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        active
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {activeTab === 'blacklist' && (
            <button onClick={() => setShowAddBlacklistModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              添加黑名单
            </button>
          )}
          {activeTab === 'parking' && (
            <div className="flex items-center gap-2 py-3">
              <div className="flex items-center gap-1">
                {(['all', 'available', 'reserved', 'occupied'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setParkingFilter(status as ParkingStatus | 'all')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      parkingFilter === status
                        ? 'bg-brand-100 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    {status === 'all'
                      ? '全部'
                      : getParkingStatusLabel(status as ParkingStatus)}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button
                onClick={() => {
                  setParkingForm({ recordId: '', plateNumber: '' })
                  setShowReserveParkingModal(true)
                }}
                className="btn-primary !py-1.5"
              >
                <Plus className="w-4 h-4" />
                预留车位
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'today' && (
            <SecurityTable
              records={todayCleared}
              showActions={false}
              securityCleared
            />
          )}
          {activeTab === 'pending' && (
            <SecurityTable
              records={pendingClear}
              showActions
              securityCleared={false}
              onClear={handleSecurityClear}
            />
          )}
          {activeTab === 'parking' && (
            <ParkingTable
              parkingSpaces={filteredParking}
              onRelease={handleReleaseParking}
            />
          )}
          {activeTab === 'staff' && (
            <StaffScheduleTable
              batches={activeBatches}
              onRecalculate={handleRecalculateStaff}
              onViewDetail={(batchId) => {
                setSelectedBatchId(batchId)
                setShowStaffAssignModal(true)
              }}
            />
          )}
          {activeTab === 'blacklist' && (
            <BlacklistTable
              data={activeBlacklist}
              onRemove={handleRemoveBlacklist}
            />
          )}
        </div>
      </div>

      <Modal
        open={showAddBlacklistModal}
        onClose={() => setShowAddBlacklistModal(false)}
        title="添加黑名单企业"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowAddBlacklistModal(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleAddBlacklist} className="btn-danger">
              <ShieldAlert className="w-4 h-4" />
              加入黑名单
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">企业名称 *</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={blacklistForm.companyName}
                onChange={(e) =>
                  setBlacklistForm((f) => ({ ...f, companyName: e.target.value }))
                }
                placeholder="请输入企业全称"
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="label">列入原因 *</label>
            <textarea
              value={blacklistForm.reason}
              onChange={(e) =>
                setBlacklistForm((f) => ({ ...f, reason: e.target.value }))
              }
              placeholder="请详细描述列入黑名单的原因，如：涉嫌窃取资料、拒不配合安保检查等"
              rows={4}
              className="input resize-none"
            />
          </div>
          <div>
            <label className="label">操作人</label>
            <input
              type="text"
              value={blacklistForm.addedBy}
              onChange={(e) =>
                setBlacklistForm((f) => ({ ...f, addedBy: e.target.value }))
              }
              className="input bg-slate-50"
            />
          </div>
          <Alert tone="warning" dismissible={false}>
            列入黑名单的企业将无法进行任何预约，系统会自动拦截其预约请求。请谨慎操作！
          </Alert>
        </div>
      </Modal>

      <Modal
        open={showReserveParkingModal}
        onClose={() => setShowReserveParkingModal(false)}
        title="预留访客车位"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowReserveParkingModal(false)}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleReserveParking} className="btn-primary">
              <Car className="w-4 h-4" />
              确认预留
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-sky-700">
                可用车位：{availableParking.length} 个
              </div>
              <div className="text-xs text-sky-600 mt-0.5">
                系统将自动分配空闲车位
              </div>
            </div>
          </div>
          <div>
            <label className="label">选择预约记录 *</label>
            <select
              value={parkingForm.recordId}
              onChange={(e) =>
                setParkingForm((f) => ({ ...f, recordId: e.target.value }))
              }
              className="input"
            >
              <option value="">请选择需要预留车位的预约</option>
              {pendingCheckInRecords.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.companyName}（{r.code}，{r.totalPeople}人）
                </option>
              ))}
            </select>
            {pendingCheckInRecords.length === 0 && (
              <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                今日暂无待签到的预约记录
              </div>
            )}
          </div>
          <div>
            <label className="label">车牌号 *</label>
            <div className="relative">
              <Car className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={parkingForm.plateNumber}
                onChange={(e) =>
                  setParkingForm((f) => ({ ...f, plateNumber: e.target.value }))
                }
                placeholder="请输入车牌号，如：京A12345"
                className="input pl-10"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={showStaffAssignModal}
        onClose={() => {
          setShowStaffAssignModal(false)
          setSelectedBatchId(null)
        }}
        title="人员排班详情"
        size="lg"
      >
        {selectedBatchStaff && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-800">
                  {selectedBatchStaff.batchName}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {selectedBatchStaff.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedBatchStaff.totalPeople}人
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedBatchStaff.routeName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => selectedBatchId && handleRecalculateStaff(selectedBatchId)}
                className="btn-secondary !py-1.5 !px-3 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重新计算
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <UserPlus className="w-4 h-4 text-brand-600" />
                  接待员（{selectedBatchStaff.reception.length}人）
                </div>
                <div className="space-y-2">
                  {selectedBatchStaff.reception.length === 0 ? (
                    <div className="text-sm text-slate-400">暂无接待员分配</div>
                  ) : (
                    selectedBatchStaff.reception.map((s: StaffMember) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 bg-brand-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-medium">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-700">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.phone}</div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">
                          {s.role === 'guide' ? '讲解员' : '接待员'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Shield className="w-4 h-4 text-purple-600" />
                  安保人员（{selectedBatchStaff.security.length}人）
                </div>
                <div className="space-y-2">
                  {selectedBatchStaff.security.length === 0 ? (
                    <div className="text-sm text-slate-400">暂无安保人员分配</div>
                  ) : (
                    selectedBatchStaff.security.map((s: StaffMember) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 bg-purple-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-700">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.phone}</div>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          安保
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {selectedBatchSecurityList.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  安保核验名单（{selectedBatchSecurityList.filter((x) => x.cleared).length}/{selectedBatchSecurityList.length}）
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>访客</th>
                        <th>企业</th>
                        <th>证件类型</th>
                        <th>证件号</th>
                        <th>核验状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatchSecurityList.map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-medium text-slate-700">{item.visitor.name}</td>
                          <td className="text-slate-600">{item.record.companyName}</td>
                          <td className="text-slate-500">{item.visitor.idType}</td>
                          <td className="font-mono text-slate-500">{maskId(item.visitor.idNumber)}</td>
                          <td>
                            {item.cleared ? (
                              <span className="badge bg-emerald-100 text-emerald-700 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                                已通过
                              </span>
                            ) : (
                              <span className="badge bg-amber-100 text-amber-700 text-xs">
                                <Clock className="w-3 h-3 mr-0.5" />
                                待核验
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="text-xs text-slate-500">
                <div className="font-medium text-slate-600 mb-1">分配规则说明：</div>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>接待员：每15人至少1名，含涉密展区额外增加</li>
                  <li>安保人员：每20人至少1名，涉密展区至少2名</li>
                  <li>人数或路线变更时，系统会自动重算人员分配</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function SecurityTable({
  records,
  showActions,
  securityCleared,
  onClear,
}: {
  records: VisitRecord[]
  showActions: boolean
  securityCleared: boolean
  onClear?: (id: string) => void
}) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <div className="text-sm">
          {securityCleared ? '今日暂无放行记录' : '暂无待核验的访客'}
        </div>
      </div>
    )
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>预约码</th>
          <th>企业</th>
          <th>人数</th>
          <th>主联系人</th>
          <th>证件信息</th>
          <th>车辆信息</th>
          <th>签到状态</th>
          <th>安保核验</th>
          {showActions && <th className="text-right">操作</th>}
        </tr>
      </thead>
      <tbody>
        {records.map((r) => {
          const primaryVisitor = r.visitors.find((v) => v.isPrimary) || r.visitors[0]
          const sBadge = statusBadge(r.status)
          return (
            <tr key={r.id} className="hover:bg-slate-50/50">
              <td>
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-xs font-medium text-slate-700">{r.code}</span>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate max-w-[180px]">
                      {r.companyName}
                    </div>
                    {r.batchCode && (
                      <div className="text-xs text-slate-400 mt-0.5">{r.batchCode}</div>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{r.totalPeople}</span>
                  <span className="text-slate-400">人</span>
                </span>
              </td>
              <td>
                {primaryVisitor ? (
                  <div className="min-w-0">
                    <div className="font-medium text-slate-700">{primaryVisitor.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      {maskPhone(primaryVisitor.phone)}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td>
                {primaryVisitor ? (
                  <div className="text-xs">
                    <div className="text-slate-600">{primaryVisitor.idType}</div>
                    <div className="font-mono text-slate-400 mt-0.5">
                      {maskId(primaryVisitor.idNumber)}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td>
                {r.vehicle ? (
                  <div className="text-xs">
                    <div className="flex items-center gap-1 text-slate-700">
                      <Car className="w-3 h-3 text-slate-400" />
                      <span className="font-mono font-medium">{r.vehicle.plateNumber}</span>
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      {r.vehicle.vehicleType} · {r.vehicle.driverName}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">无车辆</span>
                )}
              </td>
              <td>
                <span className={cn('badge', sBadge.className)}>{sBadge.label}</span>
                {r.checkInAt && (
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(r.checkInAt).slice(11)}
                  </div>
                )}
              </td>
              <td>
                {r.securityCleared ? (
                  <span className="badge bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="w-3 h-3 mr-0.5" />
                    已核验
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-700">
                    <Shield className="w-3 h-3 mr-0.5" />
                    待核验
                  </span>
                )}
              </td>
              {showActions && (
                <td className="text-right">
                  {onClear && !r.securityCleared && (
                    <button
                      onClick={() => onClear(r.id)}
                      className="btn-success !py-1.5 !px-3 text-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      安保放行
                    </button>
                  )}
                </td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function BlacklistTable({
  data,
  onRemove,
}: {
  data: BlacklistCompany[]
  onRemove: (id: string, name: string) => void
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <div className="text-sm">黑名单为空，系统安全状态良好</div>
      </div>
    )
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>企业名称</th>
          <th>列入原因</th>
          <th>添加时间</th>
          <th>操作人</th>
          <th>状态</th>
          <th className="text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {data.map((b) => (
          <tr key={b.id} className="hover:bg-red-50/30">
            <td>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="font-semibold text-slate-800">{b.companyName}</span>
              </div>
            </td>
            <td>
              <div className="max-w-md">
                <span className="text-sm text-slate-600 line-clamp-2">{b.reason}</span>
              </div>
            </td>
            <td>
              <div className="text-sm text-slate-600">{formatDateTime(b.addedAt)}</div>
            </td>
            <td>
              <span className="text-sm text-slate-600">{b.addedBy}</span>
            </td>
            <td>
              {b.active ? (
                <span className="badge bg-red-100 text-red-700">
                  <X className="w-3 h-3 mr-0.5" />
                  拦截中
                </span>
              ) : (
                <span className="badge bg-slate-100 text-slate-500">已解除</span>
              )}
            </td>
            <td className="text-right">
              {b.active && (
                <button
                  onClick={() => onRemove(b.id, b.companyName)}
                  className="btn-ghost !text-red-600 hover:!bg-red-50 !py-1.5 !px-3 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  移除
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ParkingTable({
  parkingSpaces,
  onRelease,
}: {
  parkingSpaces: ParkingSpace[]
  onRelease: (id: string, code: string) => void
}) {
  if (parkingSpaces.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <div className="text-sm">暂无车位数据</div>
      </div>
    )
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>车位编号</th>
          <th>位置</th>
          <th>状态</th>
          <th>使用企业</th>
          <th>车牌号</th>
          <th>预留时间</th>
          <th className="text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {parkingSpaces.map((p) => {
          const StatusIcon = getParkingStatusIcon(p.status)
          return (
            <tr key={p.id} className="hover:bg-slate-50/50">
              <td>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                      p.status === 'available'
                        ? 'bg-emerald-50 text-emerald-600'
                        : p.status === 'reserved'
                          ? 'bg-amber-50 text-amber-600'
                          : p.status === 'occupied'
                            ? 'bg-sky-50 text-sky-600'
                            : 'bg-red-50 text-red-600',
                    )}
                  >
                    <Car className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-semibold text-slate-700">{p.code}</span>
                </div>
              </td>
              <td>
                <span className="text-sm text-slate-600">{p.location}</span>
              </td>
              <td>
                <span
                  className={cn('badge', getParkingStatusColor(p.status))}
                >
                  <StatusIcon className="w-3 h-3 mr-0.5" />
                  {getParkingStatusLabel(p.status)}
                </span>
              </td>
              <td>
                {p.reservedForCompany ? (
                  <div className="text-sm text-slate-700">{p.reservedForCompany}</div>
                ) : (
                  <span className="text-slate-400 text-sm">—</span>
                )}
              </td>
              <td>
                {p.plateNumber ? (
                  <span className="font-mono text-sm text-slate-600">{p.plateNumber}</span>
                ) : (
                  <span className="text-slate-400 text-sm">—</span>
                )}
              </td>
              <td>
                {p.reservedAt ? (
                  <div className="text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(p.reservedAt).slice(5, 16)}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm">—</span>
                )}
              </td>
              <td className="text-right">
                {p.status === 'reserved' || p.status === 'occupied' ? (
                  <button
                    onClick={() => onRelease(p.id, p.code)}
                    className="btn-ghost !text-slate-600 hover:!bg-slate-100 !py-1.5 !px-3 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    释放车位
                  </button>
                ) : null}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function StaffScheduleTable({
  batches,
  onRecalculate,
  onViewDetail,
}: {
  batches: any[]
  onRecalculate: (batchId: string) => void
  onViewDetail: (batchId: string) => void
}) {
  if (batches.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <div className="text-sm">今日暂无参观批次</div>
      </div>
    )
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>批次编号</th>
          <th>批次名称</th>
          <th>参观时间</th>
          <th>预计人数</th>
          <th>路线</th>
          <th>接待员</th>
          <th>安保人员</th>
          <th>状态</th>
          <th className="text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {batches.map((b) => {
          const totalPeople = b.records?.reduce((sum: number, r: any) => sum + r.totalPeople, 0) || b.expectedPeople || 0
          const receptionCount = b.staffAssignment?.reception?.length || 0
          const securityCount = b.staffAssignment?.security?.length || 0
          return (
            <tr key={b.id} className="hover:bg-slate-50/50">
              <td>
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-xs font-medium text-slate-700">{b.code}</span>
                </div>
              </td>
              <td>
                <div className="font-medium text-slate-800">{b.name}</div>
              </td>
              <td>
                <div className="text-sm text-slate-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {b.visitDate.slice(5, 10)} {b.startTime}-{b.endTime}
                </div>
              </td>
              <td>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{totalPeople}</span>
                  <span className="text-slate-400 text-xs">人</span>
                </span>
              </td>
              <td>
                {b.routeName ? (
                  <span className="text-sm text-slate-600">{b.routeName}</span>
                ) : (
                  <span className="text-slate-400 text-sm">—</span>
                )}
              </td>
              <td>
                <span className="inline-flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm">{receptionCount}人</span>
                </span>
              </td>
              <td>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-sm">{securityCount}人</span>
                </span>
              </td>
              <td>
                <span
                  className={cn(
                    'badge',
                    b.status === 'in_progress'
                      ? 'bg-emerald-100 text-emerald-700'
                      : b.status === 'published'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {b.status === 'in_progress' ? '进行中' : b.status === 'published' ? '已发布' : '草稿'}
                </span>
              </td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewDetail(b.id)}
                    className="btn-secondary !py-1.5 !px-3 text-xs"
                  >
                    <Users className="w-3.5 h-3.5" />
                    查看
                  </button>
                  <button
                    onClick={() => onRecalculate(b.id)}
                    className="btn-ghost !py-1.5 !px-3 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    重算
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
