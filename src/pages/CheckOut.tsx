import { useState, useMemo } from 'react'
import {
  LogOut,
  Building2,
  CalendarDays,
  Clock,
  Package,
  Camera,
  CameraOff,
  BadgeCheck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  QrCode,
  Users,
  Phone,
  StickyNote,
  Search,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn, todayStr, formatDateTime, maskPhone, statusBadge } from '@/lib/utils'
import { PageHeader, PageTitle } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Alert from '@/components/Alert'
import type { VisitRecord } from '@/types'

type TabKey = 'inhouse' | 'checkedout'

interface CheckOutForm {
  badgeReturned: number
  cameraCheck: 'normal' | 'abnormal'
  cameraNote?: string
  belongingsCheck: 'clear' | 'unclear'
  belongingsNote?: string
  remark?: string
}

export default function CheckOut() {
  const records = useAppStore((s) => s.records)
  const currentUser = useAppStore((s) => s.currentUser)
  const checkOut = useAppStore((s) => s.checkOut)

  const [activeTab, setActiveTab] = useState<TabKey>('inhouse')
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [form, setForm] = useState<CheckOutForm>({
    badgeReturned: 0,
    cameraCheck: 'normal',
    belongingsCheck: 'clear',
  })

  const inhouseRecords = useMemo(() => {
    const list = records.filter(
      (r) =>
        ['checked_in', 'visiting', 'material_collected'].includes(r.status) &&
        !['cancelled', 'rejected', 'checked_out'].includes(r.status),
    )
    if (!searchText.trim()) return list
    const q = searchText.toLowerCase().trim()
    return list.filter(
      (r) =>
        r.companyName.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.visitors.some((v) => v.name.toLowerCase().includes(q)),
    )
  }, [records, searchText])

  const checkedOutRecords = useMemo(() => {
    const today = todayStr()
    const list = records.filter(
      (r) => r.status === 'checked_out' && r.checkOutAt && r.checkOutAt.slice(0, 10) === today,
    )
    if (!searchText.trim()) return list
    const q = searchText.toLowerCase().trim()
    return list.filter(
      (r) =>
        r.companyName.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.visitors.some((v) => v.name.toLowerCase().includes(q)),
    )
  }, [records, searchText])

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedRecordId),
    [records, selectedRecordId],
  )

  const collectedMaterials = useMemo(() => {
    if (!selectedRecord) return []
    return selectedRecord.materials.filter((m) => m.collectedAt)
  }, [selectedRecord])

  const handleSelectRecord = (record: VisitRecord) => {
    setSelectedRecordId(record.id)
    setForm({
      badgeReturned: record.totalPeople,
      cameraCheck: 'normal',
      belongingsCheck: 'clear',
      remark: '',
      cameraNote: '',
      belongingsNote: '',
    })
  }

  const handleCheckOut = () => {
    if (!selectedRecord) return
    if (form.badgeReturned < selectedRecord.totalPeople) {
      if (
        !confirm(
          `胸卡回收数量(${form.badgeReturned})少于访客总数(${selectedRecord.totalPeople})，是否确认提交？`,
        )
      )
        return
    }
    const result = checkOut(selectedRecord.id, currentUser)
    if (result.success) {
      setAlertMsg({ type: 'success', text: `${selectedRecord.companyName} 离场核销成功` })
      setSelectedRecordId(null)
      setTimeout(() => setAlertMsg(null), 3000)
    } else {
      setAlertMsg({ type: 'error', text: result.message || '离场核销失败' })
    }
  }

  const statsIn = inhouseRecords.length
  const statsOut = checkedOutRecords.length
  const statsPeopleIn = inhouseRecords.reduce((s, r) => s + r.totalPeople, 0)
  const statsPeopleOut = checkedOutRecords.reduce((s, r) => s + r.totalPeople, 0)

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          title="离场核销"
          desc="回收胸卡、检查拍照设备与随身物品，完成访客离场流程"
        />
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索企业/预约码/访客"
            className="input pl-10"
          />
        </div>
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

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="在馆访客批次"
          value={statsIn}
          icon={<Users className="w-5 h-5" />}
          tone="amber"
        />
        <StatCard
          label="在馆总人数"
          value={statsPeopleIn}
          icon={<Building2 className="w-5 h-5" />}
          tone="sky"
        />
        <StatCard
          label="今日已离场"
          value={statsOut}
          icon={<LogOut className="w-5 h-5" />}
          tone="emerald"
        />
        <StatCard
          label="离场总人数"
          value={statsPeopleOut}
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="slate"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center px-6 border-b border-slate-200">
          {[
            {
              key: 'inhouse' as TabKey,
              label: '在馆待离场',
              icon: Building2,
              count: statsIn,
              tone: 'amber',
            },
            {
              key: 'checkedout' as TabKey,
              label: '今日已离场',
              icon: CheckCircle2,
              count: statsOut,
              tone: 'emerald',
            },
          ].map((t) => {
            const Icon = t.icon
            const active = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key)
                  setSelectedRecordId(null)
                }}
                className={cn(
                  'flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors -mb-px',
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-12 min-h-[600px]">
          <div className="col-span-7 border-r border-slate-200 overflow-y-auto max-h-[700px]">
            {activeTab === 'inhouse' ? (
              inhouseRecords.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-12 h-12" />}
                  title="所有访客已离场"
                  desc="今日访客均已完成离场核销"
                />
              ) : (
                <RecordList
                  records={inhouseRecords}
                  selectedId={selectedRecordId}
                  onSelect={handleSelectRecord}
                  showCheckOut={false}
                />
              )
            ) : checkedOutRecords.length === 0 ? (
              <EmptyState
                icon={<LogOut className="w-12 h-12" />}
                title="今日暂无离场记录"
                desc="访客完成离场后将显示在此处"
              />
            ) : (
              <RecordList
                records={checkedOutRecords}
                selectedId={selectedRecordId}
                onSelect={handleSelectRecord}
                showCheckOut
              />
            )}
          </div>

          <div className="col-span-5 bg-slate-50/50">
            {selectedRecord ? (
              <div className="p-6 space-y-5 h-full overflow-y-auto">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-brand-600" />
                      {selectedRecord.companyName}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5" />
                        {selectedRecord.code}
                      </span>
                      {selectedRecord.batchCode && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {selectedRecord.batchCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'badge',
                      statusBadge(selectedRecord.status).className,
                    )}
                  >
                    {statusBadge(selectedRecord.status).label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InfoItem
                    icon={<Users className="w-4 h-4" />}
                    label="访客人数"
                    value={`${selectedRecord.totalPeople} 人`}
                  />
                  <InfoItem
                    icon={<BadgeCheck className="w-4 h-4" />}
                    label="签到时间"
                    value={selectedRecord.checkInAt ? formatDateTime(selectedRecord.checkInAt).slice(11) : '—'}
                  />
                </div>

                <div className="card p-4 border-dashed">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <Package className="w-4 h-4 text-slate-500" />
                    已领取物料
                  </div>
                  {collectedMaterials.length === 0 ? (
                    <div className="text-sm text-slate-400">暂无领取记录</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedRecord.materials.map((m) => {
                        const collected = !!m.collectedAt
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {collected ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-300" />
                              )}
                              <span className={collected ? 'text-slate-700' : 'text-slate-400'}>
                                {m.name}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'font-medium',
                                collected ? 'text-slate-700' : 'text-slate-400',
                              )}
                            >
                              ×{m.quantity}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="card p-4 border-dashed">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    {selectedRecord.photoAllowed ? (
                      <Camera className="w-4 h-4 text-slate-500" />
                    ) : (
                      <CameraOff className="w-4 h-4 text-red-500" />
                    )}
                    拍照限制
                  </div>
                  <div
                    className={cn(
                      'text-sm',
                      selectedRecord.photoAllowed ? 'text-slate-600' : 'text-red-600 font-medium',
                    )}
                  >
                    {selectedRecord.photoAllowed
                      ? '该路线允许拍照（非涉密区域）'
                      : '该路线禁止拍照（含涉密展区）'}
                  </div>
                  {selectedRecord.hasSecretZone && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>含涉密展区，请严格检查拍照设备是否留存涉密影像</span>
                    </div>
                  )}
                </div>

                {activeTab === 'inhouse' && (
                  <>
                    <div className="border-t border-slate-200 pt-5 space-y-4">
                      <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-brand-600" />
                        离场核销表单
                      </div>

                      <div>
                        <label className="label">
                          <span className="flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5 text-slate-400" />
                            胸卡回收数量
                            <span className="text-slate-400 font-normal">
                              （应回收 {selectedRecord.totalPeople} 枚）
                            </span>
                          </span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={selectedRecord.totalPeople + 5}
                          value={form.badgeReturned}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, badgeReturned: Math.max(0, parseInt(e.target.value) || 0) }))
                          }
                          className="input"
                        />
                        {form.badgeReturned < selectedRecord.totalPeople && (
                          <div className="mt-1.5 flex items-start gap-1 text-xs text-amber-600">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>胸卡回收数量不足，请注意跟进</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="label">
                          <span className="flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5 text-slate-400" />
                            拍照设备检查
                          </span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <RadioOption
                            checked={form.cameraCheck === 'normal'}
                            onClick={() => setForm((f) => ({ ...f, cameraCheck: 'normal' }))}
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            label="正常"
                            desc="无涉密影像留存"
                            tone="emerald"
                          />
                          <RadioOption
                            checked={form.cameraCheck === 'abnormal'}
                            onClick={() => setForm((f) => ({ ...f, cameraCheck: 'abnormal' }))}
                            icon={<AlertCircle className="w-4 h-4" />}
                            label="异常"
                            desc="需进一步核查"
                            tone="red"
                          />
                        </div>
                        {form.cameraCheck === 'abnormal' && (
                          <input
                            type="text"
                            value={form.cameraNote || ''}
                            onChange={(e) => setForm((f) => ({ ...f, cameraNote: e.target.value }))}
                            placeholder="请描述异常情况..."
                            className="input mt-2 text-sm"
                          />
                        )}
                      </div>

                      <div>
                        <label className="label">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                            随身物品检查
                          </span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <RadioOption
                            checked={form.belongingsCheck === 'clear'}
                            onClick={() => setForm((f) => ({ ...f, belongingsCheck: 'clear' }))}
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            label="无异常"
                            desc="未携带涉密物品"
                            tone="emerald"
                          />
                          <RadioOption
                            checked={form.belongingsCheck === 'unclear'}
                            onClick={() => setForm((f) => ({ ...f, belongingsCheck: 'unclear' }))}
                            icon={<AlertCircle className="w-4 h-4" />}
                            label="需核查"
                            desc="可疑物品待确认"
                            tone="amber"
                          />
                        </div>
                        {form.belongingsCheck === 'unclear' && (
                          <input
                            type="text"
                            value={form.belongingsNote || ''}
                            onChange={(e) => setForm((f) => ({ ...f, belongingsNote: e.target.value }))}
                            placeholder="请描述需核查物品..."
                            className="input mt-2 text-sm"
                          />
                        )}
                      </div>

                      <div>
                        <label className="label">
                          <span className="flex items-center gap-1">
                            <StickyNote className="w-3.5 h-3.5 text-slate-400" />
                            备注
                          </span>
                        </label>
                        <textarea
                          value={form.remark || ''}
                          onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                          placeholder="其他需要记录的信息..."
                          rows={2}
                          className="input resize-none text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCheckOut}
                      className="btn-primary w-full py-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      确认离场核销
                    </button>
                  </>
                )}

                {activeTab === 'checkedout' && selectedRecord.checkOutAt && (
                  <div className="border-t border-slate-200 pt-5">
                    <div className="card p-4 bg-emerald-50/50 border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-emerald-700">离场完成</div>
                          <div className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            离场时间：{formatDateTime(selectedRecord.checkOutAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                <LogOut className="w-16 h-16 opacity-30 mb-4" />
                <div className="text-sm font-medium">选择左侧访客记录</div>
                <div className="text-xs mt-1">查看详情或进行离场核销</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="card p-3">
      <div className="text-xs text-slate-500 flex items-center gap-1.5">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-700">{value}</div>
    </div>
  )
}

function RadioOption({
  checked,
  onClick,
  icon,
  label,
  desc,
  tone,
}: {
  checked: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  desc: string
  tone: 'emerald' | 'red' | 'amber'
}) {
  const toneMap = {
    emerald: checked
      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
      : 'border-slate-200 hover:border-slate-300',
    red: checked
      ? 'border-red-500 bg-red-50 ring-2 ring-red-100'
      : 'border-slate-200 hover:border-slate-300',
    amber: checked
      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-100'
      : 'border-slate-200 hover:border-slate-300',
  }
  const iconTone = {
    emerald: checked ? 'text-emerald-600' : 'text-slate-400',
    red: checked ? 'text-red-600' : 'text-slate-400',
    amber: checked ? 'text-amber-600' : 'text-slate-400',
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'border-2 rounded-xl p-3 text-left transition-all',
        toneMap[tone],
      )}
    >
      <div className="flex items-center gap-2">
        <span className={iconTone[tone]}>{icon}</span>
        <span className={cn('text-sm font-medium', checked ? 'text-slate-800' : 'text-slate-600')}>
          {label}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-slate-500 ml-6">{desc}</div>
    </button>
  )
}

function RecordList({
  records,
  selectedId,
  onSelect,
  showCheckOut,
}: {
  records: VisitRecord[]
  selectedId: string | null
  onSelect: (r: VisitRecord) => void
  showCheckOut: boolean
}) {
  return (
    <div className="divide-y divide-slate-100">
      {records.map((r) => {
        const primary = r.visitors.find((v) => v.isPrimary) || r.visitors[0]
        const sBadge = statusBadge(r.status)
        const selected = selectedId === r.id
        return (
          <div
            key={r.id}
            onClick={() => onSelect(r)}
            className={cn(
              'p-4 cursor-pointer transition-colors',
              selected ? 'bg-brand-50/80' : 'hover:bg-slate-50',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-semibold text-slate-800 truncate">{r.companyName}</span>
                  <span
                    className={cn(
                      'badge shrink-0 text-[10px] !px-1.5',
                      sBadge.className,
                    )}
                  >
                    {sBadge.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {r.totalPeople}人
                  </span>
                  {primary && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {maskPhone(primary.phone)}
                    </span>
                  )}
                  <span className="font-mono">{r.code}</span>
                </div>
                {showCheckOut && r.checkOutAt && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                    <Clock className="w-3 h-3" />
                    离场：{formatDateTime(r.checkOutAt)}
                  </div>
                )}
                {!showCheckOut && r.checkInAt && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <Clock className="w-3 h-3" />
                    签到：{formatDateTime(r.checkInAt).slice(11)}
                  </div>
                )}
              </div>
              <div
                className={cn(
                  'w-2 h-2 rounded-full shrink-0 mt-2',
                  selected ? 'bg-brand-600' : 'bg-slate-300',
                )}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12">
      <div className="opacity-30 mb-4">{icon}</div>
      <div className="text-sm font-medium text-slate-600">{title}</div>
      <div className="text-xs mt-1">{desc}</div>
    </div>
  )
}
