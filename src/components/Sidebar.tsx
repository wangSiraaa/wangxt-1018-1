import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  UserCheck,
  Timer,
  Route,
  ShieldAlert,
  LogOut,
  FileText,
  ChevronLeft,
  ChevronRight,
  Pill,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const groups = [
  {
    title: '运营中心',
    items: [
      { to: '/', label: '总览仪表盘', icon: LayoutDashboard },
      { to: '/batches', label: '参观批次', icon: CalendarDays },
      { to: '/routes', label: '路线安排', icon: Route },
    ],
  },
  {
    title: '接待流程',
    items: [
      { to: '/reception', label: '接待签到台', icon: UserCheck },
      { to: '/secret', label: '涉密审批', icon: ShieldCheck },
      { to: '/waiting', label: '候补队列', icon: Timer },
      { to: '/security', label: '安保名单', icon: ShieldAlert },
      { to: '/checkout', label: '离场核销', icon: LogOut },
    ],
  },
  {
    title: '合规审计',
    items: [
      { to: '/audit', label: '审计日志', icon: FileText },
    ],
  },
]

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const loc = useLocation()
  return (
    <aside
      className={cn(
        'relative h-full bg-gradient-to-b from-brand-900 to-brand-800 text-white transition-all duration-300 flex flex-col',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Pill className="w-6 h-6 text-brand-200" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-brand-50 truncate">药企展厅访客系统</div>
            <div className="text-xs text-brand-300">Exhibition Visitor SYS</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {groups.map((g) => (
          <div key={g.title}>
            {!collapsed && (
              <div className="text-xs font-semibold text-brand-300 px-3 mb-2 uppercase tracking-wider">
                {g.title}
              </div>
            )}
            <ul className="space-y-1">
              {g.items.map((item) => {
                const Icon = item.icon
                const active =
                  item.to === '/'
                    ? loc.pathname === '/'
                    : loc.pathname.startsWith(item.to)
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                        active
                          ? 'bg-white/15 text-white shadow-inner'
                          : 'text-brand-100/80 hover:bg-white/10 hover:text-white',
                        collapsed && 'justify-center',
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-brand-300 group-hover:text-white')} />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="h-11 shrink-0 flex items-center justify-center border-t border-white/10 text-brand-200 hover:bg-white/10 transition-colors"
        title={collapsed ? '展开' : '收起'}
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  )
}
