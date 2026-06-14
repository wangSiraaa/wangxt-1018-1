import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Plus,
  Eye,
  Edit,
  Users,
  QrCode,
  Search,
  Filter,
  ChevronDown,
  Calendar,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle, PageActions } from '@/components/PageHeader'
import Modal from '@/components/Modal'
import { statusBadge, formatDate } from '@/lib/utils'
import type { BatchStatus } from '@/types'

export default function BatchList() {
  const navigate = useNavigate()
  const batches = useAppStore((s) => s.batches)
  const routes = useAppStore((s) => s.routes)
  const guides = useAppStore((s) => s.guides)
  const getBatchUsedCapacity = useAppStore((s) => s.getBatchUsedCapacity)
  const updateBatchStatus = useAppStore((s) => s.updateBatchStatus)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all')
  const [qrModalBatch, setQrModalBatch] = useState<string | null>(null)

  const statusOptions: { value: BatchStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部状态' },
    { value: 'draft', label: '草稿' },
    { value: 'published', label: '已发布' },
    { value: 'in_progress', label: '进行中' },
    { value: 'completed', label: '已完成' },
    { value: 'cancelled', label: '已取消' },
  ]

  const filtered = batches.filter((b) => {
    const matchSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const selectedBatch = qrModalBatch ? batches.find((b) => b.id === qrModalBatch) : null
  const bookingUrl = selectedBatch
    ? `${window.location.origin}/book/${selectedBatch.id}`
    : ''

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle title="参观批次" desc="管理所有参观批次，支持创建、编辑、发布和预约链接管理" />
        <PageActions>
          <button
            className="btn-primary"
            onClick={() => navigate('/batches/new')}
          >
            <Plus className="w-4 h-4" />
            新建批次
          </button>
        </PageActions>
      </PageHeader>

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="搜索批次名称或编号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              className="input !w-auto min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BatchStatus | 'all')}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="w-14 h-14 mx-auto mb-4 text-slate-300" />
            <div className="text-slate-500 mb-2">暂无匹配的批次</div>
            <div className="text-sm text-slate-400 mb-4">
              {search || statusFilter !== 'all' ? '尝试调整搜索条件' : '点击右上角创建第一个批次'}
            </div>
            <button
              className="btn-primary"
              onClick={() => navigate('/batches/new')}
            >
              <Plus className="w-4 h-4" />
              新建批次
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>批次编号</th>
                  <th>批次名称</th>
                  <th>日期</th>
                  <th>时段</th>
                  <th>路线</th>
                  <th>讲解员</th>
                  <th>容量</th>
                  <th>状态</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const route = routes.find((r) => r.id === b.routeId)
                  const guide = guides.find((g) => g.id === b.guideId)
                  const used = getBatchUsedCapacity(b.id)
                  const percent = Math.min(100, Math.round((used / b.capacity) * 100))
                  const badge = statusBadge(b.status)
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs text-slate-500">{b.code}</td>
                      <td className="font-medium">{b.name}</td>
                      <td className="whitespace-nowrap text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(b.date)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-slate-600 tabular-nums">
                        {b.startTime} - {b.endTime}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${route?.color} text-white`}>
                          {route?.name}
                          {route?.requiresNda && (
                            <span className="ml-0.5 text-[10px] bg-white/25 px-1 rounded">NDA</span>
                          )}
                        </span>
                      </td>
                      <td className="text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-medium">
                            {guide?.name.charAt(0)}
                          </div>
                          {guide?.name}
                        </div>
                      </td>
                      <td className="min-w-[140px]">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percent >= 100
                                  ? 'bg-red-500'
                                  : percent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 tabular-nums whitespace-nowrap">
                            {used}/{b.capacity}
                          </span>
                        </div>
                        {percent >= 100 && (
                          <div className="text-[11px] text-red-600 font-medium">已满员</div>
                        )}
                        {percent < 100 && percent >= 80 && (
                          <div className="text-[11px] text-amber-600 font-medium">即将满员</div>
                        )}
                      </td>
                      <td>
                        <span className={badge.className}>{badge.label}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="btn-ghost !p-1.5"
                            title="查看详情"
                            onClick={() => navigate(`/batches`)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-ghost !p-1.5"
                            title="编辑"
                            onClick={() => navigate(`/batches/edit/${b.id}`)}
                            disabled={b.status === 'completed' || b.status === 'cancelled'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-ghost !p-1.5"
                            title="管理预约"
                            onClick={() => navigate(`/waiting`)}
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-ghost !p-1.5"
                            title="预约二维码 / 链接"
                            onClick={() => setQrModalBatch(b.id)}
                            disabled={b.status === 'cancelled'}
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {b.status === 'draft' && (
                            <button
                              className="btn-success !px-2 !py-1 !text-xs"
                              onClick={() => updateBatchStatus(b.id, 'published')}
                            >
                              发布
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!selectedBatch}
        onClose={() => setQrModalBatch(null)}
        title={`批次预约链接 · ${selectedBatch?.code}`}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setQrModalBatch(null)}>
              关闭
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                navigator.clipboard?.writeText(bookingUrl)
              }}
            >
              复制链接
            </button>
          </>
        }
      >
        {selectedBatch && (
          <div className="space-y-4 text-center">
            <div className="p-6 bg-gradient-to-br from-brand-50 to-sky-50 rounded-xl">
              <div className="w-40 h-40 mx-auto bg-white rounded-2xl shadow-inner flex items-center justify-center border-2 border-dashed border-brand-200">
                <div className="text-center">
                  <QrCode className="w-20 h-20 mx-auto text-brand-600 mb-2" />
                  <div className="text-[10px] text-slate-400">扫码预约</div>
                </div>
              </div>
            </div>
            <div className="text-left space-y-2">
              <div>
                <div className="text-xs text-slate-500 mb-1">批次名称</div>
                <div className="font-medium">{selectedBatch.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">日期时段</div>
                <div className="font-medium text-slate-700">
                  {formatDate(selectedBatch.date)} {selectedBatch.startTime}-{selectedBatch.endTime}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">预约链接</div>
                <div className="p-2.5 bg-slate-50 rounded-lg font-mono text-xs text-slate-700 break-all border border-slate-200">
                  {bookingUrl}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
