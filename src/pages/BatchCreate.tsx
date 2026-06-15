import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  Users,
  MapPin,
  User,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Route as RouteIcon,
  FileText,
  Camera,
  RefreshCw,
  Wrench,
  Shield,
  BadgeCheck,
  BookOpen,
  ShoppingBag,
  Phone,
  Package,
  Shirt,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle, PageActions } from '@/components/PageHeader'
import Alert from '@/components/Alert'
import { todayStr } from '@/lib/utils'
import type { ConflictInfo, ConflictResolutionSuggestion, StaffMember } from '@/types'

export default function BatchCreate() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const routes = useAppStore((s) => s.routes)
  const guides = useAppStore((s) => s.guides)
  const batches = useAppStore((s) => s.batches)
  const staff = useAppStore((s) => s.staff)
  const currentUser = useAppStore((s) => s.currentUser)
  const createBatch = useAppStore((s) => s.createBatch)
  const checkBatchConflicts = useAppStore((s) => s.checkBatchConflicts)
  const getConflictResolutionSuggestions = useAppStore((s) => s.getConflictResolutionSuggestions)
  const resolveBatchConflict = useAppStore((s) => s.resolveBatchConflict)
  const calculateBatchStaff = useAppStore((s) => s.calculateBatchStaff)
  const calculateBatchMaterials = useAppStore((s) => s.calculateBatchMaterials)
  const updateBatch = useAppStore((s) => s.updateBatch)

  const editBatch = useMemo(() => batches.find((b) => b.id === id), [batches, id])

  const [form, setForm] = useState({
    name: editBatch?.name || '',
    date: editBatch?.date || todayStr(),
    startTime: editBatch?.startTime || '09:30',
    endTime: editBatch?.endTime || '11:00',
    routeId: editBatch?.routeId || '',
    guideId: editBatch?.guideId || '',
    capacity: editBatch?.capacity || 10,
    notes: editBatch?.notes || '',
  })

  const [submitted, setSubmitted] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const selectedRoute = routes.find((r) => r.id === form.routeId)
  const selectedGuide = guides.find((g) => g.id === form.guideId)

  const conflicts: ConflictInfo[] = useMemo(() => {
    if (!form.date || !form.startTime || !form.endTime) return []
    return checkBatchConflicts(
      {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        routeId: form.routeId,
        guideId: form.guideId,
      },
      isEdit ? id : undefined,
    )
  }, [form.date, form.startTime, form.endTime, form.routeId, form.guideId, isEdit, id, checkBatchConflicts])

  const hasErrorConflict = conflicts.some((c) => c.level === 'error')
  const hasWarningConflict = conflicts.some((c) => c.level === 'warning')

  const conflictSuggestions: ConflictResolutionSuggestion[] = useMemo(() => {
    if (!id || conflicts.length === 0) return []
    return getConflictResolutionSuggestions(id)
  }, [id, conflicts.length, getConflictResolutionSuggestions])

  const previewStaffAssignment = useMemo(() => {
    if (!form.routeId || !form.date) return null
    const hasSecretZone = selectedRoute?.zones.some((z) => z.isSecret) || false
    const estimatedPeople = form.capacity
    const today = new Date(form.date).getDay()

    const availableReception = staff.filter(
      (s) => s.role === 'reception' && s.isOnDuty && s.workDays.includes(today),
    )
    const availableSecurity = staff.filter(
      (s) => s.role === 'security' && s.isOnDuty && s.workDays.includes(today),
    )

    const receptionCount = Math.min(
      Math.max(1, Math.ceil(estimatedPeople / 15)),
      availableReception.length,
    )
    const securityCount = Math.min(
      Math.max(hasSecretZone ? 2 : 1, Math.ceil(estimatedPeople / 20)),
      availableSecurity.length,
    )

    return {
      reception: availableReception.slice(0, receptionCount),
      security: availableSecurity.slice(0, securityCount),
      receptionCount,
      securityCount,
      hasSecretZone,
    }
  }, [form.routeId, form.date, form.capacity, selectedRoute, staff])

  const previewMaterials = useMemo(() => {
    if (!form.routeId) return null
    const hasSecretZone = selectedRoute?.zones.some((z) => z.isSecret) || false
    const hasSampleZone = selectedRoute?.zones.some((z) => z.name.includes('样品')) || false
    const estimatedPeople = form.capacity

    return {
      badgeCount: estimatedPeople,
      brochureCount: estimatedPeople,
      bagCount: estimatedPeople,
      sampleCount: hasSampleZone ? estimatedPeople : 0,
      safetyVestCount: hasSecretZone ? estimatedPeople : 0,
      phoneBagCount: hasSecretZone ? estimatedPeople : 0,
    }
  }, [form.routeId, form.capacity, selectedRoute])

  const applySuggestion = (suggestion: ConflictResolutionSuggestion) => {
    if (!id) return
    resolveBatchConflict(id, suggestion, currentUser)

    if (suggestion.type === 'time') {
      const [start, end] = suggestion.suggestedValue.split('-')
      updateField('startTime', start)
      updateField('endTime', end)
    } else if (suggestion.type === 'route') {
      const newRoute = routes.find((r) => r.name === suggestion.suggestedValue)
      if (newRoute) updateField('routeId', newRoute.id)
    } else if (suggestion.type === 'guide') {
      const newGuide = guides.find((g) => g.name === suggestion.suggestedValue)
      if (newGuide) updateField('guideId', newGuide.id)
    }
  }

  const handleSubmitEnhanced = (publishNow: boolean) => {
    setSubmitted(true)
    if (!isValid) return
    if (hasErrorConflict) return

    const newBatch = createBatch({
      name: form.name.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      routeId: form.routeId,
      guideId: form.guideId,
      capacity: form.capacity,
      status: publishNow ? 'published' : 'draft',
      createdBy: currentUser,
      notes: form.notes.trim() || undefined,
    })

    if (publishNow) {
      setTimeout(() => {
        calculateBatchStaff(newBatch.id, 'create')
        calculateBatchMaterials(newBatch.id)
      }, 100)
    }

    setShowSuccess(true)
    setTimeout(() => {
      navigate('/batches')
    }, 1500)
  }

  const isValid = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.date.length > 0 &&
      form.startTime.length > 0 &&
      form.endTime.length > 0 &&
      form.startTime < form.endTime &&
      form.routeId.length > 0 &&
      form.guideId.length > 0 &&
      form.capacity > 0
    )
  }, [form])

  const handleSubmit = handleSubmitEnhanced

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader>
        <PageTitle
          title={isEdit ? '编辑参观批次' : '新建参观批次'}
          desc={isEdit ? editBatch?.code : '填写批次信息，系统将自动检测排班与路线冲突'}
        />
        <PageActions>
          <button className="btn-secondary" onClick={() => navigate('/batches')}>
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
        </PageActions>
      </PageHeader>

      {showSuccess && (
        <Alert tone="success" title="保存成功" onClose={() => setShowSuccess(false)}>
          批次已创建，正在跳转到批次列表...
        </Alert>
      )}

      {hasErrorConflict && (
        <Alert tone="error" title="存在强制冲突，无法创建" dismissible={false}>
          请先解决以下红色标记的冲突后再提交
        </Alert>
      )}
      {!hasErrorConflict && hasWarningConflict && (
        <Alert tone="warning" title="存在建议调整的冲突" dismissible={false}>
          黄色标记为非强制冲突，您可以继续提交，但建议调整以优化体验
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 space-y-5">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              基本信息
            </h2>

            <div>
              <label className="label">
                批次名称 <span className="text-red-500">*</span>
              </label>
              <input
                className={`input ${submitted && !form.name.trim() ? '!border-red-400' : ''}`}
                placeholder="例如：6月15日上午VIP专家考察批次"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
              {submitted && !form.name.trim() && (
                <div className="text-xs text-red-500 mt-1">请输入批次名称</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">
                  参观日期 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    className={`input pl-9 ${submitted && !form.date ? '!border-red-400' : ''}`}
                    value={form.date}
                    min={todayStr()}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label">
                  开始时间 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    className={`input pl-9 ${submitted && !form.startTime ? '!border-red-400' : ''}`}
                    value={form.startTime}
                    onChange={(e) => updateField('startTime', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label">
                  结束时间 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="time"
                    className={`input pl-9 ${
                      submitted && (!form.endTime || form.endTime <= form.startTime)
                        ? '!border-red-400'
                        : ''
                    }`}
                    value={form.endTime}
                    onChange={(e) => updateField('endTime', e.target.value)}
                  />
                </div>
                {submitted && form.endTime && form.endTime <= form.startTime && (
                  <div className="text-xs text-red-500 mt-1">结束时间必须晚于开始时间</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  参观路线 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <RouteIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    className={`input pl-9 ${submitted && !form.routeId ? '!border-red-400' : ''}`}
                    value={form.routeId}
                    onChange={(e) => updateField('routeId', e.target.value)}
                  >
                    <option value="">请选择参观路线</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.requiresNda ? '（需NDA）' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">
                  讲解员 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    className={`input pl-9 ${submitted && !form.guideId ? '!border-red-400' : ''}`}
                    value={form.guideId}
                    onChange={(e) => updateField('guideId', e.target.value)}
                  >
                    <option value="">请选择讲解员</option>
                    {guides.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} · {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  批次容量（人） <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={`input pl-9 ${
                      submitted && (form.capacity <= 0 || form.capacity > 100)
                        ? '!border-red-400'
                        : ''
                    }`}
                    value={form.capacity}
                    onChange={(e) => updateField('capacity', Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  />
                </div>
                {selectedRoute && (
                  <div className="text-xs text-slate-500 mt-1.5">
                    路线「{selectedRoute.name}」建议容量 ≤ {Math.min(...selectedRoute.zones.map((z) => z.capacity))} 人
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="label">备注说明</label>
              <textarea
                className="input min-h-[90px] resize-y"
                placeholder="特殊要求、参观重点、来访人员背景说明等..."
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="card p-6">
              <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                {hasErrorConflict ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                冲突检测结果
              </h2>
              <div className="space-y-3">
                {conflicts.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${
                      c.level === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    {c.level === 'error' ? (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${
                        c.level === 'error' ? 'text-red-800' : 'text-amber-800'
                      }`}>
                        {c.type === 'guide' ? '讲解员排班冲突' : c.type === 'zone' ? '展区容量冲突' : '路线冲突'}
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.level === 'error' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                        }`}>
                          {c.level === 'error' ? '强制阻止' : '建议调整'}
                        </span>
                      </div>
                      <div className={`text-sm mt-1 ${
                        c.level === 'error' ? 'text-red-700' : 'text-amber-700'
                      }`}>
                        {c.message}
                      </div>
                      {c.conflictingBatchName && (
                        <div className={`text-xs mt-1.5 ${
                          c.level === 'error' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          冲突批次：{c.conflictingBatchName}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {conflictSuggestions.length > 0 && (
            <div className="card p-6">
              <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-brand-600" />
                智能重排建议
                <span className="badge bg-brand-100 text-brand-700 text-xs">
                  <Sparkles className="w-3 h-3" />
                  AI 建议
                </span>
              </h2>
              <div className="space-y-3">
                {conflictSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${
                      s.impactLevel === 'high'
                        ? 'bg-red-50 border-red-200'
                        : s.impactLevel === 'medium'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      s.impactLevel === 'high'
                        ? 'bg-red-500 text-white'
                        : s.impactLevel === 'medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-500 text-white'
                    }`}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800">
                        {s.suggestion}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        原：{s.originalValue} → 建议：{s.suggestedValue}
                      </div>
                      {s.affectedBatches && s.affectedBatches.length > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          影响批次：{s.affectedBatches.length} 个
                        </div>
                      )}
                      <div className="mt-3">
                        <button
                          className="btn-primary !py-1.5 !px-3 text-xs"
                          onClick={() => applySuggestion(s)}
                        >
                          <RefreshCw className="w-3 h-3" />
                          一键应用
                        </button>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      s.impactLevel === 'high'
                        ? 'bg-red-100 text-red-700'
                        : s.impactLevel === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {s.impactLevel === 'high' ? '高影响' : s.impactLevel === 'medium' ? '中影响' : '低影响'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewStaffAssignment && (
            <div className="card p-6">
              <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" />
                人员自动分配预览
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                  <div className="flex items-center gap-2 mb-3">
                    <BadgeCheck className="w-4 h-4 text-sky-600" />
                    <span className="font-semibold text-sky-800">接待员</span>
                    <span className="badge bg-sky-500 text-white text-xs">
                      {previewStaffAssignment.receptionCount} 人
                    </span>
                  </div>
                  <div className="space-y-2">
                    {previewStaffAssignment.reception.map((s: StaffMember) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-sky-800">{s.name}</span>
                        <span className="text-xs text-sky-600">· {s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-800">安保人员</span>
                    <span className="badge bg-red-500 text-white text-xs">
                      {previewStaffAssignment.securityCount} 人
                      {previewStaffAssignment.hasSecretZone && ' (涉密加倍)'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {previewStaffAssignment.security.map((s: StaffMember) => (
                      <div key={s.id} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-red-800">{s.name}</span>
                        <span className="text-xs text-red-600">· {s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                系统根据人数（{form.capacity}人）和路线类型自动计算，每15人配1名接待员，每20人配1名安保（涉密路线加倍）
              </div>
            </div>
          )}

          {previewMaterials && (
            <div className="card p-6">
              <h2 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-600" />
                物料自动计算预览
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <BadgeCheck className="w-5 h-5 mx-auto mb-1 text-slate-600" />
                  <div className="text-lg font-bold text-slate-800">{previewMaterials.badgeCount}</div>
                  <div className="text-xs text-slate-500">胸卡</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <BookOpen className="w-5 h-5 mx-auto mb-1 text-slate-600" />
                  <div className="text-lg font-bold text-slate-800">{previewMaterials.brochureCount}</div>
                  <div className="text-xs text-slate-500">宣传册</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <ShoppingBag className="w-5 h-5 mx-auto mb-1 text-slate-600" />
                  <div className="text-lg font-bold text-slate-800">{previewMaterials.bagCount}</div>
                  <div className="text-xs text-slate-500">环保袋</div>
                </div>
                {previewMaterials.sampleCount > 0 && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                    <Package className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                    <div className="text-lg font-bold text-purple-800">{previewMaterials.sampleCount}</div>
                    <div className="text-xs text-purple-600">样品</div>
                  </div>
                )}
                {previewMaterials.safetyVestCount > 0 && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                    <Shirt className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                    <div className="text-lg font-bold text-amber-800">{previewMaterials.safetyVestCount}</div>
                    <div className="text-xs text-amber-600">安全背心</div>
                  </div>
                )}
                {previewMaterials.phoneBagCount > 0 && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                    <Phone className="w-5 h-5 mx-auto mb-1 text-red-600" />
                    <div className="text-lg font-bold text-red-800">{previewMaterials.phoneBagCount}</div>
                    <div className="text-xs text-red-600">封存袋</div>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                系统根据路线配置自动计算，涉密路线额外配安全背心和手机封存袋，样品展区路线配样品
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 p-4 bg-white rounded-xl border border-slate-200">
            <button
              className="btn-secondary"
              onClick={() => navigate('/batches')}
            >
              取消
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleSubmit(false)}
              disabled={!isValid || hasErrorConflict}
            >
              <Save className="w-4 h-4" />
              保存草稿
            </button>
            <button
              className="btn-primary"
              onClick={() => handleSubmit(true)}
              disabled={!isValid || hasErrorConflict}
            >
              <CheckCircle2 className="w-4 h-4" />
              立即发布
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {selectedRoute && (
            <div className="card p-6">
              <div className={`-mx-6 -mt-6 mb-4 h-2 ${selectedRoute.color} rounded-t-xl`} />
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-bold text-slate-800 text-lg">{selectedRoute.name}</h3>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${selectedRoute.color}`}>
                  {selectedRoute.durationMinutes} 分钟
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4">{selectedRoute.description}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {selectedRoute.requiresNda ? (
                  <span className="badge bg-red-100 text-red-700">
                    <ShieldAlert className="w-3 h-3" />
                    需签署 NDA
                  </span>
                ) : (
                  <span className="badge bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    常规开放路线
                  </span>
                )}
                {selectedRoute.photoAllowed ? (
                  <span className="badge bg-sky-100 text-sky-700">
                    <Camera className="w-3 h-3" />
                    允许拍照
                  </span>
                ) : (
                  <span className="badge bg-slate-100 text-slate-700">
                    <Camera className="w-3 h-3" />
                    禁止拍照
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  包含展区 ({selectedRoute.zones.length})
                </div>
                <div className="space-y-2.5">
                  {selectedRoute.zones.map((z, idx) => (
                    <div
                      key={z.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        z.isSecret
                          ? 'bg-red-50/60 border-red-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                        z.isSecret
                          ? 'bg-red-500 text-white'
                          : 'bg-brand-500 text-white'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium text-sm ${
                            z.isSecret ? 'text-red-800' : 'text-slate-800'
                          }`}>
                            {z.name}
                          </span>
                          {z.isSecret && (
                            <span className="badge bg-red-500 text-white text-[10px] px-1.5 py-0">
                              涉密
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            容量 {z.capacity} 人
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {z.photoAllowed ? '可拍照' : '禁拍照'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedGuide && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                选中讲解员
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold text-lg">
                  {selectedGuide.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{selectedGuide.name}</div>
                  <div className="text-sm text-slate-500">{selectedGuide.title}</div>
                </div>
              </div>
            </div>
          )}

          {!selectedRoute && (
            <div className="card p-8 text-center">
              <RouteIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <div className="text-slate-500 text-sm">
                请先选择参观路线
                <br />
                将在此处显示路线详情
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
