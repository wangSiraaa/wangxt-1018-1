import { useState, useMemo } from 'react'
import {
  ShieldAlert,
  Building2,
  Users,
  CalendarClock,
  Eye,
  PenLine,
  CheckCircle2,
  Clock,
  FileCheck,
  UserCheck,
  QrCode,
  Zap,
  AlertTriangle,
  ShieldCheck,
  XCircle,
  FileText,
  ChevronRight,
  BadgeCheck,
  UserPlus,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle, PageActions } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Modal from '@/components/Modal'
import Alert from '@/components/Alert'
import { statusBadge, formatDateTime, cn, maskPhone, uid } from '@/lib/utils'
import type { VisitRecord, NdaRecord, TemporarySecretRequest, Visitor } from '@/types'

type TabType = 'pending' | 'done' | 'temporary'

export default function SecretApproval() {
  const records = useAppStore((s) => s.records)
  const batches = useAppStore((s) => s.batches)
  const temporaryRequests = useAppStore((s) => s.temporarySecretRequests)
  const approveNda = useAppStore((s) => s.approveNda)
  const batchApproveAllNda = useAppStore((s) => s.batchApproveAllNda)
  const approveTemporarySecret = useAppStore((s) => s.approveTemporarySecret)
  const rejectTemporarySecret = useAppStore((s) => s.rejectTemporarySecret)
  const createTemporarySecretRequest = useAppStore((s) => s.createTemporarySecretRequest)
  const completeTemporarySecretNda = useAppStore((s) => s.completeTemporarySecretNda)
  const currentUser = useAppStore((s) => s.currentUser)

  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [alert, setAlert] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null)
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: VisitRecord | null }>({
    open: false,
    record: null,
  })
  const [tempModal, setTempModal] = useState<{ open: boolean; request: TemporarySecretRequest | null }>({
    open: false,
    request: null,
  })
  const [createModal, setCreateModal] = useState<{ open: boolean; record: VisitRecord | null; visitor: Visitor | null }>({
    open: false,
    record: null,
    visitor: null,
  })
  const [signatures, setSignatures] = useState<Record<string, string>>({})
  const [tempSignatures, setTempSignatures] = useState<Record<string, string>>({})
  const [approvalComments, setApprovalComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const secretRecords = useMemo(
    () => records.filter((r) => r.hasSecretZone && r.ndaRecords.length > 0),
    [records],
  )

  const checkedInRecords = useMemo(
    () => records.filter((r) => r.checkInAt && !r.hasSecretZone && r.status !== 'checked_out'),
    [records],
  )

  const pendingList = useMemo(
    () =>
      secretRecords.filter(
        (r) => !r.ndaCompleted && r.status !== 'cancelled' && r.status !== 'rejected',
      ),
    [secretRecords],
  )

  const doneList = useMemo(() => secretRecords.filter((r) => r.ndaCompleted), [secretRecords])

  const temporaryList = useMemo(() => temporaryRequests, [temporaryRequests])

  const pendingTempList = useMemo(
    () => temporaryRequests.filter(r => r.status === 'pending' || r.status === 'manager_approved' || r.status === 'nda_pending'),
    [temporaryRequests],
  )

  const displayList = activeTab === 'pending' ? pendingList : activeTab === 'done' ? doneList : []

  const totalPendingNda = useMemo(
    () =>
      pendingList.reduce(
        (sum, r) => sum + r.ndaRecords.filter((n) => n.status === 'pending').length,
        0,
      ),
    [pendingList],
  )

  const showAlert = (tone: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setAlert({ tone, message })
    setTimeout(() => setAlert(null), 3000)
  }

  const openDetail = (record: VisitRecord) => {
    setDetailModal({ open: true, record })
    const sigs: Record<string, string> = {}
    record.ndaRecords.forEach((n) => {
      sigs[n.id] = n.signerName || n.visitorName
    })
    setSignatures(sigs)
  }

  const openTempDetail = (request: TemporarySecretRequest) => {
    setTempModal({ open: true, request })
    if (request.status === 'nda_pending') {
      setTempSignatures({ [request.id]: request.visitorName })
    }
    setApprovalComments('')
    setRejectionReason('')
  }

  const openCreateModal = (record: VisitRecord, visitor: Visitor) => {
    setCreateModal({ open: true, record, visitor })
  }

  const handleSingleApprove = (recordId: string, ndaId: string) => {
    const sig = signatures[ndaId]?.trim()
    if (!sig) {
      showAlert('error', '请输入签署人姓名')
      return
    }
    approveNda(recordId, ndaId, currentUser, sig)
    showAlert('success', 'NDA审批通过')
    const updated = records.find((r) => r.id === recordId)
    if (updated) {
      setDetailModal({ open: true, record: { ...updated } })
    }
  }

  const handleBatchApprove = (recordId: string) => {
    batchApproveAllNda(recordId, currentUser)
    showAlert('success', '已批量签署全部NDA')
    setTimeout(() => setDetailModal({ open: false, record: null }), 800)
  }

  const handleCreateTempRequest = () => {
    if (!createModal.record || !createModal.visitor) return
    
    const result = createTemporarySecretRequest({
      recordId: createModal.record.id,
      visitorId: createModal.visitor.id,
      visitorName: createModal.visitor.name,
      companyName: createModal.record.companyName,
      secretZoneId: 'temp_zone',
      secretZoneName: '临时涉密区',
      reason: '现场临时申请',
      estimatedDuration: 60,
      requestedBy: currentUser,
      requestedAt: new Date().toISOString(),
    })

    if (result) {
      showAlert('success', '临时涉密申请已提交，等待负责人确认')
      setCreateModal({ open: false, record: null, visitor: null })
    } else {
      showAlert('error', '申请失败，请重试')
    }
  }

  const handleManagerApprove = (requestId: string) => {
    const success = approveTemporarySecret(requestId, 'manager', currentUser, approvalComments)
    if (success) {
      showAlert('success', '负责人审批通过，等待NDA签署')
      setTempModal({ open: false, request: null })
    }
  }

  const handleNdaSign = (requestId: string) => {
    const sig = tempSignatures[requestId]?.trim()
    if (!sig) {
      showAlert('error', '请输入签署人姓名')
      return
    }
    const success = completeTemporarySecretNda(requestId, currentUser, sig)
    if (success) {
      showAlert('success', 'NDA已签署，可进入涉密区')
      setTempModal({ open: false, request: null })
    }
  }

  const handleReject = (requestId: string) => {
    if (!rejectionReason.trim()) {
      showAlert('error', '请填写拒绝原因')
      return
    }
    const success = rejectTemporarySecret(requestId, currentUser, rejectionReason)
    if (success) {
      showAlert('warning', '已拒绝申请')
      setTempModal({ open: false, request: null })
    }
  }

  const updateSignature = (ndaId: string, value: string) => {
    setSignatures((prev) => ({ ...prev, [ndaId]: value }))
  }

  const getBatchName = (batchId: string) => {
    return batches.find(b => b.id === batchId)?.name || '—'
  }

  const renderProgressBar = (ndaRecords: NdaRecord[]) => {
    const total = ndaRecords.length
    const approved = ndaRecords.filter((n) => n.status === 'approved').length
    const percent = total === 0 ? 0 : (approved / total) * 100
    return (
      <div className="w-full">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-500 flex items-center gap-1">
            <FileCheck className="w-3 h-3" />
            NDA进度
          </span>
          <span className="font-medium text-slate-700 tabular-nums">
            {approved}/{total} 已签
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              percent === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-amber-500 to-orange-500',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    )
  }

  const getTempStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      pending: { label: '待负责人确认', className: 'badge bg-amber-100 text-amber-700' },
      manager_approved: { label: '负责人已确认', className: 'badge bg-blue-100 text-blue-700' },
      nda_pending: { label: '待签NDA', className: 'badge bg-purple-100 text-purple-700' },
      approved: { label: '已通过', className: 'badge bg-emerald-100 text-emerald-700' },
      rejected: { label: '已拒绝', className: 'badge bg-red-100 text-red-700' },
      expired: { label: '已过期', className: 'badge bg-slate-100 text-slate-700' },
    }
    return configs[status] || { label: status, className: 'badge bg-slate-100 text-slate-700' }
  }

  const renderCard = (record: VisitRecord) => {
    const badge = statusBadge(record.status)
    const pendingCount = record.ndaRecords.filter((n) => n.status === 'pending').length

    return (
      <div key={record.id} className="card p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="badge bg-red-100 text-red-700">
                <ShieldAlert className="w-3 h-3" />
                涉密审批
              </span>
              <span className={badge.className}>{badge.label}</span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                <QrCode className="w-3 h-3" />
                {record.code}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              {record.companyName}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold text-purple-600 tabular-nums">
              {record.totalPeople}
            </div>
            <div className="text-xs text-slate-500">人</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              待签 <span className="font-medium text-amber-600 tabular-nums">{pendingCount}</span> 人
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <CalendarClock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{formatDateTime(record.appliedAt)}</span>
          </div>
        </div>

        <div className="mb-4">{renderProgressBar(record.ndaRecords)}</div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <UserCheck className="w-4 h-4" />
            主联系人：
            {record.visitors.find((v) => v.isPrimary)?.name || record.visitors[0]?.name}
            <span className="tabular-nums">
              ({maskPhone(record.contactPhone)})
            </span>
          </div>
          <button onClick={() => openDetail(record)} className="btn-primary">
            <Eye className="w-4 h-4" />
            查看详情
          </button>
        </div>
      </div>
    )
  }

  const renderTempCard = (request: TemporarySecretRequest) => {
    const statusBadge = getTempStatusBadge(request.status)
    const record = records.find(r => r.id === request.recordId)

    return (
      <div key={request.id} className="card p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="badge bg-orange-100 text-orange-700 flex items-center gap-1">
                <UserPlus className="w-3 h-3" />
                临时申请
              </span>
              <span className={statusBadge.className}>{statusBadge.label}</span>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {request.id.slice(-8)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-slate-400" />
              {request.visitorName}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              <Building2 className="w-3.5 h-3.5 inline mr-1" />
              {request.companyName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-medium text-slate-700">
              {request.secretZoneName}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              预计 {request.estimatedDuration} 分钟
            </div>
          </div>
        </div>

        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">申请事由</div>
          <div className="text-sm text-slate-700">{request.reason}</div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-4 h-4" />
            申请时间：{formatDateTime(request.requestedAt)}
          </div>
          <button onClick={() => openTempDetail(request)} className="btn-primary">
            <Eye className="w-4 h-4" />
            处理
          </button>
        </div>
      </div>
    )
  }

  const renderVisitorRow = (visitor: Visitor, record: VisitRecord) => {
    const hasTempRequest = temporaryRequests.some(
      r => r.visitorId === visitor.id && r.recordId === record.id && !['rejected', 'expired'].includes(r.status)
    )
    const tempRequest = temporaryRequests.find(
      r => r.visitorId === visitor.id && r.recordId === record.id && !['rejected', 'expired'].includes(r.status)
    )

    return (
      <tr key={visitor.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
              {visitor.name[0]}
            </div>
            <div>
              <div className="font-medium text-slate-800 text-sm">{visitor.name}</div>
              <div className="text-xs text-slate-500">{visitor.idType} {visitor.idNumber.slice(-4)}</div>
            </div>
          </div>
        </td>
        <td className="py-2.5 px-3 text-sm text-slate-600">{record.companyName}</td>
        <td className="py-2.5 px-3 text-sm">
          <span className="badge bg-emerald-100 text-emerald-700">已签到</span>
        </td>
        <td className="py-2.5 px-3 text-sm">
          {tempRequest ? (
            <span className={getTempStatusBadge(tempRequest.status).className}>
              {getTempStatusBadge(tempRequest.status).label}
            </span>
          ) : (
            <span className="text-slate-400">未申请</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-right">
          {!hasTempRequest ? (
            <button
              onClick={() => openCreateModal(record, visitor)}
              className="btn-primary text-xs py-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              申请临时进入
            </button>
          ) : tempRequest.status === 'approved' ? (
            <span className="text-emerald-600 text-sm flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-4 h-4" />
              已授权
            </span>
          ) : (
            <span className="text-slate-400 text-sm">处理中</span>
          )}
        </td>
      </tr>
    )
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: '待处理预约', count: pendingList.length },
    { key: 'done', label: '已完成审批', count: doneList.length },
    { key: 'temporary', label: '临时涉密申请', count: pendingTempList.length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          title="涉密审批中心"
          desc="管理涉密参观路线的NDA保密协议签署审批和临时涉密申请"
        />
        <PageActions>
          <div className="text-sm text-slate-500">
            当前审批人：<span className="font-medium text-slate-700">{currentUser}</span>
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
          title="待审批预约"
          value={pendingList.length}
          accent="from-amber-500 to-orange-500"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="待签NDA总数"
          value={totalPendingNda}
          accent="from-purple-500 to-fuchsia-500"
          icon={<PenLine className="w-5 h-5" />}
        />
        <StatCard
          title="临时申请待处理"
          value={pendingTempList.length}
          accent="from-orange-500 to-red-500"
          icon={<UserPlus className="w-5 h-5" />}
        />
        <StatCard
          title="已完成审批"
          value={doneList.length}
          accent="from-emerald-500 to-teal-500"
          icon={<CheckCircle2 className="w-5 h-5" />}
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
          {activeTab === 'temporary' ? (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <div className="font-semibold mb-1">已签到访客临时申请进入涉密区</div>
                    <div className="opacity-90">
                      已签到的访客如果在参观过程中临时需要进入涉密区域，需要通过此流程申请。
                      流程：提交申请 → 负责人确认 → 签署NDA → 授权进入。
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  已签到未涉密访客（可申请临时进入）
                </h4>
                {checkedInRecords.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <div>暂无已签到的访客</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 text-xs">
                        <tr>
                          <th className="py-3 px-3 text-left">访客</th>
                          <th className="py-3 px-3 text-left">单位</th>
                          <th className="py-3 px-3 text-left">状态</th>
                          <th className="py-3 px-3 text-left">涉密申请</th>
                          <th className="py-3 px-3 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checkedInRecords.flatMap(record => 
                          record.visitors.filter(v => v.checkInAt).map(v => renderVisitorRow(v, record))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  待处理的临时申请
                </h4>
                {pendingTempList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <div>暂无待处理的临时申请</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pendingTempList.map(renderTempCard)}
                  </div>
                )}
              </div>
            </div>
          ) : displayList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <div>{activeTab === 'pending' ? '暂无待审批的涉密预约' : '暂无已处理记录'}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayList.map(renderCard)}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, record: null })}
        title={
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            NDA保密协议审批 - {detailModal.record?.companyName}
          </div>
        }
        size="lg"
        footer={
          <>
            <button
              onClick={() => setDetailModal({ open: false, record: null })}
              className="btn-secondary"
            >
              关闭
            </button>
            {detailModal.record &&
              detailModal.record.ndaRecords.some((n) => n.status === 'pending') && (
                <button
                  onClick={() => handleBatchApprove(detailModal.record!.id)}
                  className="btn-warning"
                >
                  <Zap className="w-4 h-4" />
                  一键批量签署
                </button>
              )}
          </>
        }
      >
        {detailModal.record && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="text-xs text-slate-500 mb-1">预约码</div>
                <div className="font-mono font-medium text-slate-800">{detailModal.record.code}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">参观人数</div>
                <div className="font-medium text-slate-800 tabular-nums">
                  {detailModal.record.totalPeople} 人
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">申请时间</div>
                <div className="font-medium text-slate-800 text-sm">
                  {formatDateTime(detailModal.record.appliedAt)}
                </div>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <div className="font-semibold mb-1">涉密路线提示</div>
                  <div className="opacity-90">
                    本次参观包含涉密区域，所有访客必须签署《保密协议（NDA）》后方可入场。
                    请逐人核对身份并确认签署意愿。
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-purple-600" />
                  访客NDA签署列表
                </h4>
                {renderProgressBar(detailModal.record.ndaRecords)}
              </div>

              <div className="space-y-3">
                {detailModal.record.ndaRecords.map((nda) => {
                  const visitor = detailModal.record!.visitors.find(
                    (v) => v.id === nda.visitorId,
                  )
                  const isApproved = nda.status === 'approved'
                  return (
                    <div
                      key={nda.id}
                      className={cn(
                        'p-4 rounded-xl border-2 transition-colors',
                        isApproved
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-slate-200 bg-white',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-base">
                              {nda.visitorName}
                            </span>
                            {visitor?.isPrimary && (
                              <span className="badge bg-brand-100 text-brand-700">主联系人</span>
                            )}
                            {isApproved ? (
                              <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                已签署
                              </span>
                            ) : (
                              <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                待签署
                              </span>
                            )}
                          </div>
                          {visitor && (
                            <div className="mt-1 text-xs text-slate-500 flex items-center gap-3">
                              <span>证件：{visitor.idType} {visitor.idNumber.replace(/(.{4})(.+)(.{4})/, '$1********$3')}</span>
                              <span className="tabular-nums">手机：{maskPhone(visitor.phone)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {isApproved ? (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-slate-500 mb-0.5">签署人</div>
                            <div className="font-medium text-slate-700">{nda.signerName}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-0.5">签署时间</div>
                            <div className="font-medium text-slate-700">{formatDateTime(nda.signedAt)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-0.5">审批人</div>
                            <div className="font-medium text-slate-700">{nda.approvedByName}</div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 mb-0.5">审批时间</div>
                            <div className="font-medium text-slate-700">{formatDateTime(nda.approvedAt)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="label flex items-center gap-1">
                              <PenLine className="w-3 h-3" />
                              签署人姓名（电子签名确认）
                            </label>
                            <input
                              type="text"
                              value={signatures[nda.id] || ''}
                              onChange={(e) => updateSignature(nda.id, e.target.value)}
                              placeholder="请输入签署人真实姓名"
                              className="input"
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() =>
                                handleSingleApprove(detailModal.record!.id, nda.id)
                              }
                              className="btn-success"
                            >
                              <UserCheck className="w-4 h-4" />
                              确认签署并审批通过
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={tempModal.open}
        onClose={() => setTempModal({ open: false, request: null })}
        title={
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-600" />
            临时涉密申请处理
          </div>
        }
        size="lg"
        footer={
          <>
            <button
              onClick={() => setTempModal({ open: false, request: null })}
              className="btn-secondary"
            >
              关闭
            </button>
          </>
        }
      >
        {tempModal.request && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xl shrink-0">
                {tempModal.request.visitorName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800 text-lg">
                    {tempModal.request.visitorName}
                  </span>
                  <span className={getTempStatusBadge(tempModal.request.status).className}>
                    {getTempStatusBadge(tempModal.request.status).label}
                  </span>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  {tempModal.request.companyName}
                  <span className="mx-2">·</span>
                  <span className="tabular-nums">申请时间：{formatDateTime(tempModal.request.requestedAt)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
              <div>
                <div className="text-xs text-slate-500 mb-1">申请进入区域</div>
                <div className="font-medium text-slate-800">{tempModal.request.secretZoneName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">预计停留时间</div>
                <div className="font-medium text-slate-800">{tempModal.request.estimatedDuration} 分钟</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">申请人</div>
                <div className="font-medium text-slate-800">{tempModal.request.requestedBy}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">申请编号</div>
                <div className="font-mono font-medium text-slate-800">{tempModal.request.id}</div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-xs text-slate-600 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                申请事由
              </div>
              <div className="text-slate-800">{tempModal.request.reason}</div>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">负责人确认</div>
                  <div className="text-xs">
                    {tempModal.request.managerApprovedAt
                      ? `已通过 · ${tempModal.request.managerApprovedByName}`
                      : '待确认'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <PenLine className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">NDA签署</div>
                  <div className="text-xs">
                    {tempModal.request.ndaSignedAt
                      ? `已签署 · ${tempModal.request.ndaSignerName}`
                      : '待签署'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  tempModal.request.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400'
                )}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">授权进入</div>
                  <div className="text-xs">
                    {tempModal.request.status === 'approved' ? '已授权' : '待完成'}
                  </div>
                </div>
              </div>
            </div>

            {tempModal.request.status === 'pending' && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="label flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    审批意见（选填）
                  </label>
                  <textarea
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="请输入审批意见（选填）"
                    className="input min-h-[80px]"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <div>
                    <label className="label flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      拒绝原因
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="如需拒绝，请填写原因"
                      className="input"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => handleReject(tempModal.request!.id)}
                      className="btn-danger"
                    >
                      <XCircle className="w-4 h-4" />
                      拒绝
                    </button>
                    <button
                      onClick={() => handleManagerApprove(tempModal.request!.id)}
                      className="btn-success"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      负责人确认通过
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tempModal.request.status === 'manager_approved' && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">负责人已确认通过</div>
                    <div className="opacity-90">
                      请核对身份并让访客签署NDA保密协议
                    </div>
                    {tempModal.request.managerApprovalComments && (
                      <div className="mt-2 text-xs opacity-80">
                        审批意见：{tempModal.request.managerApprovalComments}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    <PenLine className="w-3 h-3" />
                    签署人姓名（电子签名确认）
                  </label>
                  <input
                    type="text"
                    value={tempSignatures[tempModal.request.id] || ''}
                    onChange={(e) => setTempSignatures(prev => ({ ...prev, [tempModal.request!.id]: e.target.value }))}
                    placeholder="请输入签署人真实姓名"
                    className="input"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleNdaSign(tempModal.request!.id)}
                    className="btn-success"
                  >
                    <PenLine className="w-4 h-4" />
                    确认签署NDA
                  </button>
                </div>
              </div>
            )}

            {tempModal.request.status === 'nda_pending' && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="label flex items-center gap-1">
                    <PenLine className="w-3 h-3" />
                    签署人姓名（电子签名确认）
                  </label>
                  <input
                    type="text"
                    value={tempSignatures[tempModal.request.id] || ''}
                    onChange={(e) => setTempSignatures(prev => ({ ...prev, [tempModal.request!.id]: e.target.value }))}
                    placeholder="请输入签署人真实姓名"
                    className="input"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => handleNdaSign(tempModal.request!.id)}
                    className="btn-success"
                  >
                    <PenLine className="w-4 h-4" />
                    确认签署NDA
                  </button>
                </div>
              </div>
            )}

            {tempModal.request.status === 'approved' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="text-lg font-semibold text-emerald-800">授权已通过</div>
                <div className="text-sm text-emerald-700 mt-1">
                  访客可进入 {tempModal.request.secretZoneName} 参观
                </div>
                <div className="text-xs text-emerald-600 mt-3">
                  NDA签署人：{tempModal.request.ndaSignerName} · {formatDateTime(tempModal.request.ndaSignedAt!)}
                </div>
              </div>
            )}

            {tempModal.request.status === 'rejected' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-500 text-white flex items-center justify-center">
                  <XCircle className="w-8 h-8" />
                </div>
                <div className="text-lg font-semibold text-red-800">申请已拒绝</div>
                <div className="text-sm text-red-700 mt-1">
                  拒绝原因：{tempModal.request.rejectionReason}
                </div>
                <div className="text-xs text-red-600 mt-3">
                  拒绝人：{tempModal.request.rejectedByName} · {formatDateTime(tempModal.request.rejectedAt!)}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={createModal.open}
        onClose={() => setCreateModal({ open: false, record: null, visitor: null })}
        title={
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-600" />
            申请临时进入涉密区
          </div>
        }
        size="md"
        footer={
          <>
            <button
              onClick={() => setCreateModal({ open: false, record: null, visitor: null })}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleCreateTempRequest}
              className="btn-primary"
            >
              <ShieldCheck className="w-4 h-4" />
              提交申请
            </button>
          </>
        }
      >
        {createModal.record && createModal.visitor && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shrink-0">
                {createModal.visitor.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 text-lg">
                  {createModal.visitor.name}
                </div>
                <div className="text-sm text-slate-600">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  {createModal.record.companyName}
                  <span className="mx-2">·</span>
                  <span className="tabular-nums">{maskPhone(createModal.visitor.phone)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {createModal.visitor.idType}：{createModal.visitor.idNumber}
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <div className="font-semibold mb-1">涉密区域申请提示</div>
                  <div className="opacity-90">
                    申请进入涉密区域必须经过负责人确认并签署NDA保密协议。
                    申请提交后将进入审批流程，请确保访客了解相关保密要求。
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-slate-600">
              确认要为 <span className="font-semibold text-slate-800">{createModal.visitor.name}</span> 申请临时进入涉密区吗？
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
