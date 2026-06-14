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
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle, PageActions } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Modal from '@/components/Modal'
import Alert from '@/components/Alert'
import { statusBadge, formatDateTime, cn, maskPhone } from '@/lib/utils'
import type { VisitRecord, NdaRecord } from '@/types'

type TabType = 'pending' | 'done'

export default function SecretApproval() {
  const records = useAppStore((s) => s.records)
  const approveNda = useAppStore((s) => s.approveNda)
  const batchApproveAllNda = useAppStore((s) => s.batchApproveAllNda)
  const currentUser = useAppStore((s) => s.currentUser)

  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [alert, setAlert] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [detailModal, setDetailModal] = useState<{ open: boolean; record: VisitRecord | null }>({
    open: false,
    record: null,
  })
  const [signatures, setSignatures] = useState<Record<string, string>>({})

  const secretRecords = useMemo(
    () => records.filter((r) => r.hasSecretZone && r.ndaRecords.length > 0),
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

  const displayList = activeTab === 'pending' ? pendingList : doneList

  const totalPendingNda = useMemo(
    () =>
      pendingList.reduce(
        (sum, r) => sum + r.ndaRecords.filter((n) => n.status === 'pending').length,
        0,
      ),
    [pendingList],
  )

  const showAlert = (tone: 'success' | 'error' | 'info', message: string) => {
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

  const updateSignature = (ndaId: string, value: string) => {
    setSignatures((prev) => ({ ...prev, [ndaId]: value }))
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

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'pending', label: '待处理', count: pendingList.length },
    { key: 'done', label: '已处理', count: doneList.length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          title="涉密审批中心"
          desc="管理涉密参观路线的NDA保密协议签署审批"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          {displayList.length === 0 ? (
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
    </div>
  )
}
