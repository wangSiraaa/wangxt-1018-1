import { useState, useMemo } from 'react'
import { Shield, ShieldAlert, ShieldCheck, UserCheck, Building2, Phone, Car, QrCode, Clock, Trash2, Plus, X } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn, todayStr, formatDateTime, maskId, maskPhone, statusBadge } from '@/lib/utils'
import { PageHeader, PageTitle } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import Modal from '@/components/Modal'
import Alert from '@/components/Alert'
import type { VisitRecord, BlacklistCompany } from '@/types'

type TabKey = 'today' | 'pending' | 'blacklist'

export default function SecurityList() {
  const records = useAppStore((s) => s.records)
  const blacklist = useAppStore((s) => s.blacklist)
  const currentUser = useAppStore((s) => s.currentUser)
  const securityClear = useAppStore((s) => s.securityClear)
  const addToBlacklist = useAppStore((s) => s.addToBlacklist)
  const removeFromBlacklist = useAppStore((s) => s.removeFromBlacklist)

  const [activeTab, setActiveTab] = useState<TabKey>('today')
  const [showAddBlacklistModal, setShowAddBlacklistModal] = useState(false)
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [blacklistForm, setBlacklistForm] = useState({ companyName: '', reason: '', addedBy: currentUser })

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

  const handleSecurityClear = (recordId: string) => {
    securityClear(recordId, currentUser)
    setAlertMsg({ type: 'success', text: '安保核验通过，已放行' })
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

      <div className="grid grid-cols-4 gap-4">
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
          label="黑名单企业"
          value={activeBlacklist.length}
          icon={<ShieldAlert className="w-5 h-5" />}
          tone="red"
        />
        <StatCard
          label="今日到场人数"
          value={todayCleared.reduce((sum, r) => sum + r.totalPeople, 0)}
          icon={<UserCheck className="w-5 h-5" />}
          tone="sky"
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
