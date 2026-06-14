import { useNavigate } from 'react-router-dom'
import {
  Users,
  ShieldAlert,
  Ban,
  Route as RouteIcon,
  CalendarDays,
  UserCheck,
  Clock,
  ShieldCheck,
  ArrowRight,
  Play,
  Eye,
  QrCode,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { PageHeader, PageTitle, PageActions } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import { statusBadge, todayStr, formatDateTime } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const batches = useAppStore((s) => s.batches)
  const records = useAppStore((s) => s.records)
  const routes = useAppStore((s) => s.routes)
  const guides = useAppStore((s) => s.guides)
  const getBatchUsedCapacity = useAppStore((s) => s.getBatchUsedCapacity)

  const today = todayStr()
  const todayBatches = batches.filter((b) => b.date === today && b.status !== 'cancelled')
  const inVisitors = records.filter(
    (r) => ['checked_in', 'visiting', 'material_collected'].includes(r.status),
  )
  const ndaPending = records.filter((r) => r.status === 'nda_pending')
  const waiting = records.filter((r) => r.status === 'waiting_list')

  const scenarios = [
    {
      id: 1,
      title: '人数超限候补',
      desc: '批次容量满员后，新预约自动进入候补队列，名额释放时自动顺位递补',
      icon: Users,
      color: 'from-orange-500 to-amber-600',
      page: '/waiting',
    },
    {
      id: 2,
      title: '涉密未确认拦截',
      desc: '涉密路线必须签署NDA并审批通过后方可签到，未通过者现场拦截',
      icon: ShieldAlert,
      color: 'from-purple-500 to-violet-600',
      page: '/secret',
    },
    {
      id: 3,
      title: '签到后不能取消',
      desc: '访客已签到入场后禁止取消预约，必须走离场核销流程收胸卡',
      icon: Ban,
      color: 'from-red-500 to-rose-600',
      page: '/checkout',
    },
    {
      id: 4,
      title: '路线冲突调整',
      desc: '实时检测讲解员排班重叠与展区容量冲突，红色强制阻止黄色建议调整',
      icon: RouteIcon,
      color: 'from-sky-500 to-blue-600',
      page: '/routes',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle title="运营总览" desc="药企展厅访客智能管理系统 · 今日概览" />
        <PageActions>
          <button
            className="btn-primary"
            onClick={() => navigate('/batches/new')}
          >
            <CalendarDays className="w-4 h-4" />
            新建批次
          </button>
        </PageActions>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="今日批次"
          value={todayBatches.length}
          icon={<CalendarDays className="w-5 h-5" />}
          accent="from-brand-500 to-brand-600"
          delta={`${todayBatches.filter((b) => b.status === 'in_progress').length} 场进行中`}
          deltaTone="positive"
        />
        <StatCard
          title="在馆访客"
          value={inVisitors.reduce((sum, r) => sum + r.totalPeople, 0)}
          icon={<UserCheck className="w-5 h-5" />}
          accent="from-emerald-500 to-teal-600"
          delta={`${inVisitors.length} 个代表团`}
          deltaTone="positive"
        />
        <StatCard
          title="待NDA审批"
          value={ndaPending.length}
          icon={<ShieldCheck className="w-5 h-5" />}
          accent="from-purple-500 to-violet-600"
          delta={`${ndaPending.reduce((sum, r) => sum + r.ndaRecords.filter((n) => n.status === 'pending').length, 0)} 份待签`}
          deltaTone="neutral"
        />
        <StatCard
          title="候补中"
          value={waiting.length}
          icon={<Clock className="w-5 h-5" />}
          accent="from-amber-500 to-orange-600"
          delta={`共 ${waiting.reduce((sum, r) => sum + r.totalPeople, 0)} 人等待`}
          deltaTone="neutral"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">演示场景引导</h2>
          <span className="text-xs text-slate-400">点击卡片体验核心业务流程</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {scenarios.map((sc) => {
            const Icon = sc.icon
            return (
              <div
                key={sc.id}
                className="card p-5 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                onClick={() => navigate(sc.page)}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${sc.color} text-white flex items-center justify-center shadow-md mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2 group-hover:text-brand-700 transition-colors">
                  {sc.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4 min-h-[60px]">
                  {sc.desc}
                </p>
                <button className="btn-primary w-full">
                  <Play className="w-4 h-4" />
                  立即体验
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">今日批次列表</h2>
          <button
            className="btn-ghost text-sm"
            onClick={() => navigate('/batches')}
          >
            查看全部 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {todayBatches.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div>今日暂无安排的参观批次</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>批次编号</th>
                  <th>批次名称</th>
                  <th>时段</th>
                  <th>路线</th>
                  <th>讲解员</th>
                  <th>容量进度</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {todayBatches.map((b) => {
                  const route = routes.find((r) => r.id === b.routeId)
                  const guide = guides.find((g) => g.id === b.guideId)
                  const used = getBatchUsedCapacity(b.id)
                  const percent = Math.min(100, Math.round((used / b.capacity) * 100))
                  const badge = statusBadge(b.status)
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="font-mono text-xs text-slate-500">{b.code}</td>
                      <td className="font-medium">{b.name}</td>
                      <td className="text-slate-600 whitespace-nowrap">
                        {b.startTime} - {b.endTime}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${route?.color} text-white`}>
                          {route?.name}
                        </span>
                      </td>
                      <td className="text-slate-600">{guide?.name}</td>
                      <td className="min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                percent >= 100
                                  ? 'bg-red-500'
                                  : percent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
                            {used}/{b.capacity}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={badge.className}>{badge.label}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn-ghost !p-1.5"
                            title="查看详情"
                            onClick={() => navigate(`/batches`)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="btn-ghost !p-1.5"
                            title="预约二维码"
                            onClick={() => {
                              const url = `${window.location.origin}/book/${b.id}`
                              navigator.clipboard?.writeText(url)
                              alert(`预约链接已复制：${url}`)
                            }}
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
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
    </div>
  )
}
