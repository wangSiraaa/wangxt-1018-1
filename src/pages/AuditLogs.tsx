import { useState, useMemo } from 'react'
import {
  FileText,
  Search,
  CalendarDays,
  User,
  Layers,
  Tag,
  Globe,
  Info,
  Filter,
  Download,
  ChevronDown,
  Clock,
  BadgeCheck,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  XCircle,
  FileCheck,
  Shield,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn, formatDateTime } from '@/lib/utils'
import { PageHeader, PageTitle } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import type { AuditLog } from '@/types'

const ACTION_COLORS: Record<string, { bg: string; icon: React.ReactNode }> = {
  签到: { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <BadgeCheck className="w-3.5 h-3.5" /> },
  离场核销: { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: <LogOut className="w-3.5 h-3.5" /> },
  创建批次: { bg: 'bg-sky-100 text-sky-700 border-sky-200', icon: <CalendarDays className="w-3.5 h-3.5" /> },
  预约创建: { bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: <FileText className="w-3.5 h-3.5" /> },
  NDA审批通过: { bg: 'bg-purple-100 text-purple-700 border-purple-200', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  候补登记: { bg: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  候补转正: { bg: 'bg-teal-100 text-teal-700 border-teal-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  取消预约: { bg: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
  加入黑名单: { bg: 'bg-rose-100 text-rose-700 border-rose-200', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  安保放行: { bg: 'bg-green-100 text-green-700 border-green-200', icon: <Shield className="w-3.5 h-3.5" /> },
  黑名单校验通过: { bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  物料领取: { bg: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: <FileCheck className="w-3.5 h-3.5" /> },
  黑名单拦截: { bg: 'bg-red-100 text-red-700 border-red-200', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  VisitRecord: '访客记录',
  VisitBatch: '参观批次',
  NdaRecord: 'NDA记录',
  BlacklistCompany: '黑名单企业',
}

export default function AuditLogs() {
  const auditLogs = useAppStore((s) => s.auditLogs)
  const [searchText, setSearchText] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [operatorFilter, setOperatorFilter] = useState<string>('')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [showFilters, setShowFilters] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const allActions = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.action))),
    [auditLogs],
  )
  const allOperators = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.operator))),
    [auditLogs],
  )
  const allTargetTypes = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.targetType))),
    [auditLogs],
  )

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (actionFilter && log.action !== actionFilter) return false
      if (operatorFilter && log.operator !== operatorFilter) return false
      if (targetTypeFilter && log.targetType !== targetTypeFilter) return false
      if (dateFrom && log.timestamp.slice(0, 10) < dateFrom) return false
      if (dateTo && log.timestamp.slice(0, 10) > dateTo) return false
      if (searchText.trim()) {
        const q = searchText.toLowerCase().trim()
        const haystack = [
          log.action,
          log.operator,
          log.targetType,
          log.targetName || '',
          log.details,
          log.targetId,
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [auditLogs, actionFilter, operatorFilter, targetTypeFilter, dateFrom, dateTo, searchText])

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  const pageData = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayLogs = auditLogs.filter((l) => l.timestamp.slice(0, 10) === today)
    const warnLogs = auditLogs.filter((l) =>
      ['加入黑名单', '黑名单拦截', '取消预约'].includes(l.action),
    )
    const securityLogs = auditLogs.filter((l) =>
      ['安保放行', 'NDA审批通过', '黑名单校验通过'].includes(l.action),
    )
    return {
      today: todayLogs.length,
      warn: warnLogs.length,
      security: securityLogs.length,
      total: auditLogs.length,
    }
  }, [auditLogs])

  const handleExport = () => {
    const headers = ['时间', '操作人', '操作类型', '对象类型', '对象名称', '详情', 'IP地址']
    const rows = filteredLogs.map((l) => [
      formatDateTime(l.timestamp),
      l.operator,
      l.action,
      TARGET_TYPE_LABELS[l.targetType] || l.targetType,
      l.targetName || '',
      l.details,
      l.ip || '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `审计日志_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getActionStyle = (action: string) =>
    ACTION_COLORS[action] || {
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: <Info className="w-3.5 h-3.5" />,
    }

  const getActionIcon = (action: string) => {
    const style = getActionStyle(action)
    return style.icon
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          title="审计日志"
          desc="记录系统所有关键操作，支持按时间/操作人/操作类型等多维度筛选与导出"
        />
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary">
            <Download className="w-4 h-4" />
            导出 CSV
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="今日操作数"
          value={stats.today}
          icon={<CalendarDays className="w-5 h-5" />}
          tone="sky"
        />
        <StatCard
          label="安全相关"
          value={stats.security}
          icon={<ShieldCheck className="w-5 h-5" />}
          tone="emerald"
        />
        <StatCard
          label="预警记录"
          value={stats.warn}
          icon={<AlertTriangle className="w-5 h-5" />}
          tone="amber"
        />
        <StatCard
          label="日志总数"
          value={stats.total}
          icon={<FileText className="w-5 h-5" />}
          tone="slate"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value)
                  setPage(1)
                }}
                placeholder="搜索操作人/操作类型/对象名称/详情..."
                className="input pl-10"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn('btn-secondary', showFilters && 'bg-brand-50 text-brand-700')}
            >
              <Filter className="w-4 h-4" />
              筛选
              <ChevronDown
                className={cn('w-4 h-4 transition-transform', showFilters && 'rotate-180')}
              />
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="label flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  操作类型
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value)
                    setPage(1)
                  }}
                  className="input"
                >
                  <option value="">全部操作</option>
                  {allActions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  操作人
                </label>
                <select
                  value={operatorFilter}
                  onChange={(e) => {
                    setOperatorFilter(e.target.value)
                    setPage(1)
                  }}
                  className="input"
                >
                  <option value="">全部操作人</option>
                  {allOperators.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  对象类型
                </label>
                <select
                  value={targetTypeFilter}
                  onChange={(e) => {
                    setTargetTypeFilter(e.target.value)
                    setPage(1)
                  }}
                  className="input"
                >
                  <option value="">全部类型</option>
                  {allTargetTypes.map((t) => (
                    <option key={t} value={t}>
                      {TARGET_TYPE_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  开始日期
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPage(1)
                  }}
                  className="input"
                />
              </div>

              <div>
                <label className="label flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  结束日期
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPage(1)
                  }}
                  className="input"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>
            共 <span className="font-semibold text-slate-700">{filteredLogs.length}</span> 条日志
            {filteredLogs.length !== auditLogs.length && (
              <span className="ml-2">
                （从 <span className="font-medium">{auditLogs.length}</span> 条中筛选）
              </span>
            )}
          </span>
          <span>
            第 <span className="font-semibold text-slate-700">{page}</span> / {totalPages} 页
          </span>
        </div>

        <div className="overflow-x-auto">
          {pageData.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <div className="text-sm">暂无符合条件的日志记录</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="w-44">时间</th>
                  <th className="w-36">操作人</th>
                  <th className="w-36">操作类型</th>
                  <th className="w-28">对象类型</th>
                  <th>对象名称</th>
                  <th>详情</th>
                  <th className="w-32">IP 地址</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((log) => {
                  const style = getActionStyle(log.action)
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{formatDateTime(log.timestamp)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 flex items-center justify-center text-xs font-medium shrink-0">
                            {log.operator.slice(-2)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {log.operator}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium',
                            style.bg,
                          )}
                        >
                          {getActionIcon(log.action)}
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-slate-100 text-slate-600">
                          {TARGET_TYPE_LABELS[log.targetType] || log.targetType}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700 font-medium">
                            {log.targetName || (
                              <span className="text-slate-400 text-xs font-mono">
                                {log.targetId.slice(0, 12)}...
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div
                          className="text-sm text-slate-600 max-w-md truncate"
                          title={log.details}
                        >
                          {log.details}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span
                            className={cn(
                              'font-mono',
                              log.ip === 'system'
                                ? 'text-slate-400 italic'
                                : 'text-slate-600',
                            )}
                          >
                            {log.ip || '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary !py-1.5 !px-3 text-xs"
            >
              上一页
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                    p === page
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary !py-1.5 !px-3 text-xs"
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
