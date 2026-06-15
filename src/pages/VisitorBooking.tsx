import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Pill,
  Calendar,
  Clock,
  User,
  Users,
  Building2,
  Phone,
  Mail,
  Plus,
  Trash2,
  Star,
  Car,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Camera,
  FileCheck,
  ArrowRight,
  Home,
  Globe,
  ShieldCheck,
  ShieldX,
  UserCheck,
  Clock3,
  BadgeInfo,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import Stepper from '@/components/Stepper'
import Alert from '@/components/Alert'
import { uid, formatDate, statusBadge } from '@/lib/utils'
import type { Visitor, Vehicle, VisitorValidationResult, VisitorCategory } from '@/types'

type StepKey = 'validate' | 'fill' | 'confirm'

export default function VisitorBooking() {
  const { batchId } = useParams()

  const getBatchById = useAppStore((s) => s.getBatchById)
  const getBatchUsedCapacity = useAppStore((s) => s.getBatchUsedCapacity)
  const isCompanyBlacklisted = useAppStore((s) => s.isCompanyBlacklisted)
  const routes = useAppStore((s) => s.routes)
  const guides = useAppStore((s) => s.guides)
  const createVisitRecord = useAppStore((s) => s.createVisitRecord)
  const validateVisitor = useAppStore((s) => s.validateVisitor)
  const getExternalPartner = useAppStore((s) => s.getExternalPartner)
  const getForeignConfig = useAppStore((s) => s.getForeignConfig)
  const foreignConfigs = useAppStore((s) => s.foreignConfigs)

  const batch = batchId ? getBatchById(batchId) : undefined
  const route = batch ? routes.find((r) => r.id === batch.routeId) : undefined
  const guide = batch ? guides.find((g) => g.id === batch.guideId) : undefined
  const usedCapacity = batch ? getBatchUsedCapacity(batch.id) : 0
  const remainingCapacity = batch ? Math.max(0, batch.capacity - usedCapacity) : 0

  const [step, setStep] = useState<StepKey>('validate')
  const [companyName, setCompanyName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [visitors, setVisitors] = useState<Visitor[]>([
    {
      id: uid('v_tmp'),
      name: '',
      idType: '身份证',
      idNumber: '',
      phone: '',
      isPrimary: true,
      nationality: '中国',
      isForeign: false,
    },
  ])
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [showVehicle, setShowVehicle] = useState(false)
  const [blacklistChecked, setBlacklistChecked] = useState(false)
  const [validationChecked, setValidationChecked] = useState(false)
  const [result, setResult] = useState<null | {
    success: boolean
    recordCode?: string
    waitingList?: boolean
    waitingRank?: number
    message?: string
    needsApproval?: boolean
    approvalMessage?: string
    visitorCategory?: VisitorCategory
  }>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (batch) {
      setStep('fill')
    }
  }, [batch])

  const blacklistMatch = useMemo(() => {
    if (!companyName.trim() || !blacklistChecked) return undefined
    return isCompanyBlacklisted(companyName)
  }, [companyName, blacklistChecked, isCompanyBlacklisted])

  const validationResult = useMemo<VisitorValidationResult | undefined>(() => {
    if (!companyName.trim() || !validationChecked) return undefined
    const hasAnyVisitorData = visitors.some((v) => v.name.trim() && v.idNumber.trim())
    if (!hasAnyVisitorData) return undefined
    return validateVisitor(companyName, visitors)
  }, [companyName, validationChecked, visitors, validateVisitor])

  const partnerInfo = useMemo(() => {
    if (!companyName.trim()) return undefined
    return getExternalPartner(companyName)
  }, [companyName, getExternalPartner])

  const hasForeignVisitor = useMemo(() => {
    return visitors.some((v) => v.isForeign)
  }, [visitors])

  const totalPeople = visitors.length
  const willOverflow = batch ? usedCapacity + totalPeople > batch.capacity : false

  const primaryVisitor = visitors.find((v) => v.isPrimary)

  const getCategoryIcon = (category: VisitorCategory) => {
    switch (category) {
      case 'blacklist':
        return <ShieldX className="w-4 h-4" />
      case 'foreign':
        return <Globe className="w-4 h-4" />
      case 'external_partner':
        return <BadgeInfo className="w-4 h-4" />
      case 'vip':
        return <Star className="w-4 h-4" />
      default:
        return <UserCheck className="w-4 h-4" />
    }
  }

  const getCategoryLabel = (category: VisitorCategory) => {
    switch (category) {
      case 'blacklist':
        return '黑名单单位'
      case 'foreign':
        return '外籍访客'
      case 'external_partner':
        return '外部合作单位'
      case 'vip':
        return 'VIP客户'
      default:
        return '内部访客'
    }
  }

  const getCategoryColor = (category: VisitorCategory) => {
    switch (category) {
      case 'blacklist':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'foreign':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'external_partner':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'vip':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    }
  }

  const steps = [
    { key: 'validate', title: '验证批次', done: !!batch, active: step === 'validate' },
    { key: 'fill', title: '填写信息', done: result !== null || step === 'confirm', active: step === 'fill' },
    { key: 'confirm', title: '确认提交', done: result !== null, active: step === 'confirm' },
  ]

  const updateVisitor = (idx: number, patch: Partial<Visitor>) => {
    setVisitors((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v
        let next = { ...v, ...patch }
        if (patch.idType === '护照') {
          next = { ...next, isForeign: true, nationality: next.nationality || '美国' }
        } else if (patch.idType === '身份证') {
          next = { ...next, isForeign: false, nationality: '中国' }
        }
        if (patch.isPrimary === true) {
          return next
        }
        return next
      }),
    )
    if (patch.isPrimary === true) {
      setVisitors((prev) =>
        prev.map((v, i) => (i === idx ? v : { ...v, isPrimary: false })),
      )
    }
    setValidationChecked(true)
  }

  const addVisitor = () => {
    setVisitors((prev) => [
      ...prev,
      {
        id: uid('v_tmp'),
        name: '',
        idType: '身份证',
        idNumber: '',
        phone: '',
        isPrimary: false,
        nationality: '中国',
        isForeign: false,
      },
    ])
  }

  const removeVisitor = (idx: number) => {
    if (visitors.length <= 1) return
    const wasPrimary = visitors[idx].isPrimary
    setVisitors((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      if (wasPrimary && next.length > 0) {
        next[0] = { ...next[0], isPrimary: true }
      }
      return next
    })
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    setBlacklistChecked(true)
    setValidationChecked(true)

    if (!companyName.trim()) {
      errors.companyName = '请输入单位名称'
    } else if (validationResult?.level === 'block') {
      errors.companyName = validationResult.message
    }
    if (!purpose.trim()) errors.purpose = '请输入参观目的'
    if (!/^1[3-9]\d{9}$/.test(contactPhone)) errors.contactPhone = '请输入有效的手机号码'
    if (contactEmail && !/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(contactEmail)) {
      errors.contactEmail = '请输入有效的邮箱地址'
    }

    visitors.forEach((v, i) => {
      if (!v.name.trim()) errors[`v_${i}_name`] = '请输入姓名'
      if (!v.idNumber.trim()) {
        errors[`v_${i}_idNumber`] = '请输入证件号'
      } else if (v.idType === '身份证' && !/^\d{17}[\dXx]$/.test(v.idNumber)) {
        errors[`v_${i}_idNumber`] = '身份证号格式不正确'
      } else if (v.idType === '护照' && !/^[A-Za-z0-9]{5,}$/.test(v.idNumber)) {
        errors[`v_${i}_idNumber`] = '护照号格式不正确'
      }
      if (!/^1[3-9]\d{9}$/.test(v.phone)) errors[`v_${i}_phone`] = '请输入有效手机号'
      if (v.isForeign && !v.nationality?.trim()) {
        errors[`v_${i}_nationality`] = '请输入国籍'
      }
    })

    if (showVehicle && vehicle) {
      if (!vehicle.plateNumber.trim()) errors.vehiclePlate = '请输入车牌号'
      if (!vehicle.driverName.trim()) errors.vehicleDriver = '请输入司机姓名'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (!validateForm()) return
    if (primaryVisitor) {
      if (!contactPhone) setContactPhone(primaryVisitor.phone)
    }
    setStep('confirm')
  }

  const isFormBlocked = useMemo(() => {
    return !!blacklistMatch || validationResult?.level === 'block'
  }, [blacklistMatch, validationResult])

  const handleSubmit = () => {
    if (!batch || isFormBlocked) return

    const primary = visitors.find((v) => v.isPrimary) || visitors[0]
    const currentValidation = validationResult || validateVisitor(companyName, visitors)

    const visitorsWithCategory = visitors.map((v) => ({
      ...v,
      name: v.name.trim(),
      idNumber: v.idNumber.trim(),
      phone: v.phone.trim(),
      category: currentValidation.category as Visitor['category'],
    }))

    const resp = createVisitRecord({
      batchId: batch.id,
      companyName: companyName.trim(),
      visitors: visitorsWithCategory,
      vehicle: showVehicle ? vehicle || undefined : undefined,
      purpose: purpose.trim(),
      contactPhone: contactPhone || primary.phone,
      contactEmail: contactEmail.trim() || undefined,
    })

    if (resp.success && resp.record) {
      const needsApproval = currentValidation.level === 'require_approval'
      if (needsApproval) {
        resp.record.visitorCategory = currentValidation.category
        resp.record.validationResult = currentValidation
        resp.record.additionalApprovalRequired = true
        resp.record.additionalApprovalStatus = 'pending'
        resp.record.additionalApprovalReason = currentValidation.message
        resp.record.status = 'additional_approval_required'
      }

      setResult({
        success: true,
        recordCode: resp.record.code,
        waitingList: resp.record.inWaitingList,
        waitingRank: resp.record.waitingRank,
        needsApproval,
        approvalMessage: needsApproval ? currentValidation.message : undefined,
        visitorCategory: currentValidation.category,
      })
    } else {
      setResult({ success: false, message: resp.message })
    }
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-sky-50 to-slate-50 flex items-center justify-center p-6">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">批次不存在或已失效</h1>
          <p className="text-slate-500 text-sm mb-6">
            该预约链接无效，请联系发送方获取正确的预约链接。
          </p>
          <Link to="/" className="btn-primary inline-flex">
            <Home className="w-4 h-4" />
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-sky-50 to-slate-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shrink-0 shadow-md">
              <Pill className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-800 truncate">某药企集团 · 展厅预约</div>
              <div className="text-xs text-slate-500">Exhibition Visitor Booking</div>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="card p-10 text-center">
            {result.success ? (
              <>
                {result.needsApproval ? (
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg">
                    <Clock3 className="w-10 h-10" />
                  </div>
                ) : result.waitingList ? (
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg">
                    <Clock className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                )}
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  {result.needsApproval ? '预约已提交，待审批' :
                   result.waitingList ? '已进入候补队列' : '预约提交成功'}
                </h1>
                <p className="text-slate-500 mb-6">
                  申请编号：
                  <span className="font-mono font-semibold text-slate-700">{result.recordCode}</span>
                </p>
                {result.visitorCategory && (
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium mb-5 ${getCategoryColor(result.visitorCategory)}`}>
                    {getCategoryIcon(result.visitorCategory)}
                    {getCategoryLabel(result.visitorCategory)}
                  </div>
                )}
                <div className={`p-5 rounded-xl mb-8 ${
                  result.needsApproval ? 'bg-amber-50 border border-amber-200' :
                  result.waitingList ? 'bg-amber-50 border border-amber-200' :
                  'bg-emerald-50 border border-emerald-200'
                }`}>
                  {result.needsApproval ? (
                    <div className="space-y-2">
                      <div className="font-semibold text-amber-800">
                        审批流程已启动
                      </div>
                      <p className="text-sm text-amber-700">
                        {result.approvalMessage || '您的预约需要额外审批。'}
                      </p>
                      <p className="text-xs text-amber-600 mt-2">
                        审批通过后系统将通过短信通知主联系人。审批期间您可以在"我的预约"中查看进度。
                      </p>
                    </div>
                  ) : result.waitingList ? (
                    <div className="space-y-2">
                      <div className="font-semibold text-amber-800">
                        当前排位：第 <span className="text-2xl font-bold">{result.waitingRank}</span> 位
                      </div>
                      <p className="text-sm text-amber-700">
                        该批次已满员（{usedCapacity}/{batch.capacity}），您已进入候补队列。
                        有其他预约取消时，系统将按顺序自动转正并通过短信通知主联系人。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-emerald-800">
                      <div className="font-semibold">预约已确认</div>
                      <p className="text-sm">
                        请于参观当日携带身份证原件，提前 15 分钟到展厅前台签到。
                        {route?.requiresNda && ' 涉密路线需现场签署保密协议。'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="inline-flex flex-col items-start gap-2 text-left bg-slate-50 rounded-xl p-5 w-full max-w-md mb-6 border border-slate-200">
                  <div className="flex items-start gap-3 w-full">
                    <Calendar className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-slate-500">参观日期</div>
                      <div className="font-medium text-slate-800">{formatDate(batch.date)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 w-full">
                    <Clock className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-slate-500">时段</div>
                      <div className="font-medium text-slate-800">{batch.startTime} - {batch.endTime}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 w-full">
                    <Users className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-slate-500">单位 & 人数</div>
                      <div className="font-medium text-slate-800">{companyName} · {totalPeople} 人</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 w-full">
                    <MapPin className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-slate-500">参观路线</div>
                      <div className="font-medium text-slate-800">{route?.name}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setResult(null)
                      setCompanyName('')
                      setPurpose('')
                      setContactPhone('')
                      setContactEmail('')
                      setVisitors([{
                        id: uid('v_tmp'), name: '', idType: '身份证', idNumber: '', phone: '', isPrimary: true,
                        nationality: '中国', isForeign: false,
                      }])
                      setVehicle(null)
                      setShowVehicle(false)
                      setBlacklistChecked(false)
                      setValidationChecked(false)
                      setFormErrors({})
                      setStep('fill')
                    }}
                  >
                    再次预约
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-red-400 to-rose-600 text-white flex items-center justify-center shadow-lg">
                  <ShieldAlert className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">预约未通过</h1>
                <p className="text-slate-500 mb-6">{result.message || '提交失败，请稍后重试'}</p>
                <button className="btn-secondary" onClick={() => setResult(null)}>
                  返回修改
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-sky-50 to-slate-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shrink-0 shadow-md">
            <Pill className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 truncate">某药企集团 · 展厅预约</div>
            <div className="text-xs text-slate-500">Exhibition Visitor Booking</div>
          </div>
          <div className="ml-auto">
            <span className={`badge ${statusBadge(batch.status).className}`}>
              {statusBadge(batch.status).label}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="card p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className={`px-3 py-1.5 rounded-lg text-sm font-bold text-white ${route?.color || 'bg-brand-500'}`}>
              {batch.code}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-800">{batch.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  {formatDate(batch.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-brand-500" />
                  {batch.startTime} - {batch.endTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-500" />
                  {route?.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-4 h-4 text-brand-500" />
                  {guide?.name}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-slate-500 mb-1">剩余名额</div>
              <div className={`text-2xl font-bold tabular-nums ${
                remainingCapacity === 0 ? 'text-red-600' : remainingCapacity <= 3 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {remainingCapacity}/{batch.capacity}
              </div>
              {willOverflow && (
                <div className="text-xs text-amber-600 font-medium mt-1 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  提交后将进入候补
                </div>
              )}
            </div>
          </div>
          {route?.requiresNda && (
            <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200 flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-sm text-purple-800">
                <span className="font-semibold">涉密路线提示：</span>
                本路线包含保密展区，所有访客需签署《保密协议(NDA)》并经审批通过后方可签到入场。
                拍照设备需临时寄存。
              </div>
            </div>
          )}
        </div>

        <div className="card p-6">
          <Stepper steps={steps} />
        </div>

        {step === 'fill' && (
          <>
            {blacklistMatch ? (
              <Alert tone="error" title="黑名单拦截" dismissible={false}>
                <div className="font-semibold mb-1">{blacklistMatch.companyName}</div>
                <div>
                  拦截原因：{blacklistMatch.reason}
                  <br />
                  本预约无法提交，请联系接待负责人处理申诉。
                </div>
              </Alert>
            ) : null}

            <div className="card p-6 space-y-5">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 pb-3 border-b border-slate-100">
                <Building2 className="w-5 h-5 text-brand-600" />
                单位信息
              </h3>

              <div>
                <label className="label">
                  单位名称 <span className="text-red-500">*</span>
                </label>
                <input
                  className={`input ${
                    formErrors.companyName || blacklistMatch ? '!border-red-400 bg-red-50/40' : ''
                  }`}
                  placeholder="请输入企业或机构全称"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value)
                    setBlacklistChecked(true)
                    setValidationChecked(true)
                  }}
                  onBlur={() => {
                    setBlacklistChecked(true)
                    setValidationChecked(true)
                  }}
                />
                {validationResult && validationResult.level !== 'block' && companyName.trim() && (
                  <div className="mt-2.5">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${getCategoryColor(validationResult.category)}`}>
                      {getCategoryIcon(validationResult.category)}
                      {getCategoryLabel(validationResult.category)}
                    </div>
                    <div className="mt-1.5">
                      {validationResult.level === 'allow' && (
                        <div className="text-xs text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {validationResult.message}
                        </div>
                      )}
                      {validationResult.level === 'require_approval' && (
                        <div className="text-xs text-amber-600 inline-flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5" />
                          {validationResult.message}
                          <span className="ml-1 text-amber-500">·提交后将自动触发审批流程</span>
                        </div>
                      )}
                    </div>
                    {partnerInfo && (
                      <div className="mt-1.5 text-xs text-slate-500">
                        合作级别：{partnerInfo.cooperationLevel === 'strategic' ? '战略合作伙伴' : partnerInfo.cooperationLevel === 'important' ? '重要合作伙伴' : '普通合作单位'}
                        {partnerInfo.contractExpiryDate && ` · 合同到期：${formatDate(partnerInfo.contractExpiryDate)}`}
                      </div>
                    )}
                  </div>
                )}
                {blacklistChecked && !validationResult && !formErrors.companyName && !blacklistMatch && !partnerInfo && companyName.trim() && (
                  <div className="text-xs text-slate-500 mt-1.5 inline-flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    普通访客，校验通过
                  </div>
                )}
                {formErrors.companyName && (
                  <div className="text-xs text-red-600 mt-1">{formErrors.companyName}</div>
                )}
              </div>

              <div>
                <label className="label">
                  参观目的 <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`input min-h-[72px] resize-y ${formErrors.purpose ? '!border-red-400' : ''}`}
                  placeholder="例如：商务合作洽谈、技术交流、教学实习、考察调研等"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
                {formErrors.purpose && (
                  <div className="text-xs text-red-600 mt-1">{formErrors.purpose}</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    主联系人手机 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      className={`input pl-9 ${formErrors.contactPhone ? '!border-red-400' : ''}`}
                      placeholder="11位手机号"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    />
                  </div>
                  {formErrors.contactPhone && (
                    <div className="text-xs text-red-600 mt-1">{formErrors.contactPhone}</div>
                  )}
                </div>
                <div>
                  <label className="label">邮箱（可选）</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      className={`input pl-9 ${formErrors.contactEmail ? '!border-red-400' : ''}`}
                      placeholder="用于接收预约确认邮件"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                  {formErrors.contactEmail && (
                    <div className="text-xs text-red-600 mt-1">{formErrors.contactEmail}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-600" />
                  访客列表
                </h3>
                <div className="text-sm text-slate-500">
                  总人数：
                  <span className="font-bold text-brand-700 text-lg tabular-nums mx-1">
                    {totalPeople}
                  </span>
                  人
                  {willOverflow && (
                    <span className="ml-2 text-amber-600 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      超员 {usedCapacity + totalPeople - batch.capacity} 人·候补
                    </span>
                  )}
                </div>
              </div>

              {visitors.map((v, i) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-xl border ${
                    v.isPrimary
                      ? 'bg-brand-50/40 border-brand-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        v.isPrimary ? 'bg-brand-600 text-white' : 'bg-slate-300 text-white'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="font-medium text-slate-700">
                        访客 {i + 1}
                      </span>
                      {v.isPrimary && (
                        <span className="badge bg-brand-600 text-white inline-flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          主联系人
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
                          v.isPrimary
                            ? 'bg-brand-100 text-brand-700 cursor-default'
                            : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                        }`}
                        onClick={() => !v.isPrimary && updateVisitor(i, { isPrimary: true })}
                        disabled={v.isPrimary}
                      >
                        {v.isPrimary ? '已设主联系人' : '设为主联系人'}
                      </button>
                      <button
                        type="button"
                        className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        onClick={() => removeVisitor(i)}
                        disabled={visitors.length <= 1}
                        title={visitors.length <= 1 ? '至少保留1名访客' : '删除'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="label !mb-1">
                        姓名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={`input ${formErrors[`v_${i}_name`] ? '!border-red-400' : ''}`}
                        placeholder="真实姓名"
                        value={v.name}
                        onChange={(e) => updateVisitor(i, { name: e.target.value })}
                      />
                      {formErrors[`v_${i}_name`] && (
                        <div className="text-xs text-red-600 mt-1">{formErrors[`v_${i}_name`]}</div>
                      )}
                    </div>
                    <div>
                      <label className="label !mb-1">
                        手机号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={`input ${formErrors[`v_${i}_phone`] ? '!border-red-400' : ''}`}
                        placeholder="11位手机号"
                        value={v.phone}
                        onChange={(e) =>
                          updateVisitor(i, { phone: e.target.value.replace(/\D/g, '').slice(0, 11) })
                        }
                      />
                      {formErrors[`v_${i}_phone`] && (
                        <div className="text-xs text-red-600 mt-1">{formErrors[`v_${i}_phone`]}</div>
                      )}
                    </div>
                    <div>
                      <label className="label !mb-1">证件类型</label>
                      <select
                        className="input"
                        value={v.idType}
                        onChange={(e) => updateVisitor(i, { idType: e.target.value as Visitor['idType'] })}
                      >
                        <option value="身份证">身份证</option>
                        <option value="护照">护照</option>
                        <option value="军官证">军官证</option>
                      </select>
                    </div>
                    <div>
                      <label className="label !mb-1">
                        证件号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={`input font-mono ${formErrors[`v_${i}_idNumber`] ? '!border-red-400' : ''}`}
                        placeholder={v.idType === '身份证' ? '18位身份证号' : '证件号码'}
                        value={v.idNumber}
                        onChange={(e) => updateVisitor(i, { idNumber: e.target.value })}
                      />
                      {formErrors[`v_${i}_idNumber`] && (
                        <div className="text-xs text-red-600 mt-1">{formErrors[`v_${i}_idNumber`]}</div>
                      )}
                    </div>
                    {v.isForeign && (
                      <>
                        <div className="md:col-span-2">
                          <label className="label !mb-1">
                            国籍 <span className="text-red-500">*</span>
                          </label>
                          <select
                            className={`input ${formErrors[`v_${i}_nationality`] ? '!border-red-400' : ''}`}
                            value={v.nationality || ''}
                            onChange={(e) => {
                              const nationality = e.target.value
                              updateVisitor(i, { nationality })
                              const config = getForeignConfig(nationality)
                              if (config) {
                                console.log('外籍访客配置:', config)
                              }
                            }}
                          >
                            <option value="">请选择国籍</option>
                            {foreignConfigs.filter(c => c.isActive).map((c) => (
                              <option key={c.id} value={c.nationality}>
                                {c.country}（{c.nationality}）
                              </option>
                            ))}
                          </select>
                          {formErrors[`v_${i}_nationality`] && (
                            <div className="text-xs text-red-600 mt-1">{formErrors[`v_${i}_nationality`]}</div>
                          )}
                          {v.nationality && getForeignConfig(v.nationality) && (
                            <div className="mt-1.5 text-xs text-blue-600 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {`${v.nationality}籍访客需${getForeignConfig(v.nationality)!.approvalRequirement === 'ministry' ? '部委' : getForeignConfig(v.nationality)!.approvalRequirement === 'ceo' ? 'CEO' : getForeignConfig(v.nationality)!.approvalRequirement === 'director' ? '总监' : '经理'}级审批`}
                              {getForeignConfig(v.nationality)!.requiresBackgroundCheck && ' · 需背景调查'}
                              {getForeignConfig(v.nationality)!.requiresNotification && ` · 通知${getForeignConfig(v.nationality)!.notificationDepartment}`}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="w-full border-2 border-dashed border-slate-300 hover:border-brand-400 hover:bg-brand-50/40 text-slate-500 hover:text-brand-700 rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2"
                onClick={addVisitor}
              >
                <Plus className="w-4 h-4" />
                添加访客
              </button>
            </div>

            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Car className="w-5 h-5 text-brand-600" />
                  车辆信息
                </h3>
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={showVehicle}
                    onChange={(e) => {
                      setShowVehicle(e.target.checked)
                      if (e.target.checked && !vehicle) {
                        setVehicle({ plateNumber: '', vehicleType: '', driverName: '' })
                      }
                    }}
                  />
                  <span className="text-slate-600">本次有来访车辆</span>
                </label>
              </div>

              {showVehicle && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="label !mb-1">
                      车牌号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`input font-mono ${formErrors.vehiclePlate ? '!border-red-400' : ''}`}
                      placeholder="京A·88888"
                      value={vehicle?.plateNumber || ''}
                      onChange={(e) =>
                        setVehicle((v) => (v ? { ...v, plateNumber: e.target.value.toUpperCase() } : v))
                      }
                    />
                    {formErrors.vehiclePlate && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.vehiclePlate}</div>
                    )}
                  </div>
                  <div>
                    <label className="label !mb-1">车型</label>
                    <input
                      className="input"
                      placeholder="商务车 / 大巴 / 轿车"
                      value={vehicle?.vehicleType || ''}
                      onChange={(e) =>
                        setVehicle((v) => (v ? { ...v, vehicleType: e.target.value } : v))
                      }
                    />
                  </div>
                  <div>
                    <label className="label !mb-1">
                      司机姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`input ${formErrors.vehicleDriver ? '!border-red-400' : ''}`}
                      placeholder="司机姓名"
                      value={vehicle?.driverName || ''}
                      onChange={(e) =>
                        setVehicle((v) => (v ? { ...v, driverName: e.target.value } : v))
                      }
                    />
                    {formErrors.vehicleDriver && (
                      <div className="text-xs text-red-600 mt-1">{formErrors.vehicleDriver}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                className="btn-primary px-6"
                onClick={handleNext}
                disabled={isFormBlocked}
              >
                下一步 · 确认信息
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            {willOverflow && (
              <Alert tone="warning" title="容量已满，提交后进入候补队列" dismissible={false}>
                该批次当前已预约 {usedCapacity}/{batch.capacity} 人，超员 {usedCapacity + totalPeople - batch.capacity} 人。
                您的申请将自动进入候补，名额释放时按顺序递补并短信通知。
              </Alert>
            )}

            <div className="card p-6 space-y-6">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 pb-3 border-b border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-brand-600" />
                确认预约信息
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div className="p-4 rounded-xl bg-slate-50 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    参观批次
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-0.5">批次名称</div>
                    <div className="font-medium text-slate-800">{batch.name}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-0.5">日期时段</div>
                    <div className="font-medium text-slate-800 tabular-nums">
                      {formatDate(batch.date)} {batch.startTime} - {batch.endTime}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-0.5">路线 & 讲解员</div>
                    <div className="font-medium text-slate-800">
                      {route?.name} · {guide?.name}
                    </div>
                  </div>
                  {route?.requiresNda && (
                    <div className="flex items-center gap-1.5 text-purple-700">
                      <Camera className="w-3.5 h-3.5" />
                      需签署NDA · 禁止拍照
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    单位信息
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-0.5">单位名称</div>
                    <div className="font-medium text-slate-800">{companyName}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-0.5">参观目的</div>
                    <div className="font-medium text-slate-800">{purpose}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-0.5">联系方式</div>
                    <div className="font-medium text-slate-800 tabular-nums">
                      {contactPhone}
                      {contactEmail && ` / ${contactEmail}`}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  访客名单 · {totalPeople} 人
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="table !text-sm">
                    <thead>
                      <tr>
                        <th className="!py-2 !px-3">#</th>
                        <th className="!py-2 !px-3">姓名</th>
                        <th className="!py-2 !px-3">证件</th>
                        <th className="!py-2 !px-3">手机号</th>
                        <th className="!py-2 !px-3">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitors.map((v, i) => (
                        <tr key={v.id}>
                          <td className="!py-2 !px-3 text-slate-400 tabular-nums">{i + 1}</td>
                          <td className="!py-2 !px-3 font-medium">
                            {v.name}
                            {v.isPrimary && (
                              <span className="ml-1 text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
                                主
                              </span>
                            )}
                          </td>
                          <td className="!py-2 !px-3 text-slate-600 text-xs">
                            {v.idType}: {v.idNumber.slice(0, 6)}****{v.idNumber.slice(-4)}
                          </td>
                          <td className="!py-2 !px-3 tabular-nums text-slate-600">{v.phone}</td>
                          <td className="!py-2 !px-3 text-slate-400 text-xs">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {showVehicle && vehicle && (
                <div className="p-4 rounded-xl bg-slate-50">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    来访车辆
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span>
                      <span className="text-slate-500 mr-1.5">车牌：</span>
                      <span className="font-mono font-medium">{vehicle.plateNumber}</span>
                    </span>
                    {vehicle.vehicleType && (
                      <span>
                        <span className="text-slate-500 mr-1.5">车型：</span>
                        <span className="font-medium">{vehicle.vehicleType}</span>
                      </span>
                    )}
                    <span>
                      <span className="text-slate-500 mr-1.5">司机：</span>
                      <span className="font-medium">{vehicle.driverName}</span>
                    </span>
                  </div>
                </div>
              )}

              {validationResult && validationResult.level === 'require_approval' && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <Clock3 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-amber-800 mb-1">
                        需追加审批
                      </div>
                      <div className="text-sm text-amber-700">
                        <div className="mb-1">{validationResult.message}</div>
                        <div className="text-xs text-amber-600">
                          提交后将自动发起审批流程，审批通过后预约生效。
                          {validationResult.requiredApprovalRole && (
                            <span>审批人级别：{
                              validationResult.requiredApprovalRole === 'ministry' ? '部委级' :
                              validationResult.requiredApprovalRole === 'ceo' ? 'CEO' :
                              validationResult.requiredApprovalRole === 'director' ? '总监级' : '经理级'
                            }</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hasForeignVisitor && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-blue-800 mb-1">
                        外籍访客提示
                      </div>
                      <div className="text-sm text-blue-700">
                        本次预约包含外籍访客，已自动触发外籍访客审批流程。
                        请确保所有外籍访客携带有效护照原件。
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {partnerInfo && (
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="flex items-start gap-3">
                    <BadgeInfo className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-purple-800 mb-1">
                        {partnerInfo.cooperationLevel === 'strategic' ? '战略' : partnerInfo.cooperationLevel === 'important' ? '重要' : '普通'}合作伙伴
                      </div>
                      <div className="text-sm text-purple-700">
                        {partnerInfo.companyName} · 联系人：{partnerInfo.contactPerson || '未设置'}
                        {partnerInfo.contactPhone && ` · ${partnerInfo.contactPhone}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button className="btn-secondary" onClick={() => setStep('fill')}>
                返回修改
              </button>
              <button
                className="btn-primary px-8"
                onClick={handleSubmit}
                disabled={isFormBlocked}
              >
                {willOverflow ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    提交 · 进入候补
                  </>
                ) : (
                  <>
                    确认提交
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        )}

        <footer className="text-center text-xs text-slate-400 py-4">
          提交预约即视为同意《访客参观须知》及《保密条款》· 技术支持 市场部接待处
        </footer>
      </main>
    </div>
  )
}
