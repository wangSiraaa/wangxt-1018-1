import { Menu, Bell, Search, UserCircle2, Building2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { formatDateTime } from '@/lib/utils'
import { useMemo } from 'react'

interface Props {
  onToggleSidebar: () => void
}

export default function TopBar({ onToggleSidebar }: Props) {
  const currentUser = useAppStore((s) => s.currentUser)
  const records = useAppStore((s) => s.records)
  const pendingSecret = useMemo(
    () =>
      records.filter((r) => (r.status === 'nda_pending' || r.status === 'pending_approval') && r.hasSecretZone).length,
    [records],
  )
  const waitingCount = useMemo(() => records.filter((r) => r.status === 'waiting_list').length, [records])

  return (
    <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-10">
      <button
        onClick={onToggleSidebar}
        className="btn-ghost !p-2 -ml-2"
        aria-label="切换菜单"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 w-96">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          className="bg-transparent outline-none text-sm w-full placeholder:text-slate-400"
          placeholder="搜索预约编号 / 企业名称 / 批次号..."
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {(pendingSecret > 0 || waitingCount > 0) && (
          <button className="btn-ghost !p-2 relative">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {pendingSecret + waitingCount}
            </span>
          </button>
        )}

        <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building2 className="w-4 h-4" />
            <span className="font-medium text-slate-700">创新生物制药集团</span>
            <span className="text-slate-300">|</span>
            <span>今日 {formatDateTime(new Date().toISOString()).slice(0, 10)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-semibold">
            {currentUser.slice(-3, -1)}
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-sm font-medium text-slate-800">{currentUser}</div>
            <div className="text-xs text-slate-500">展厅运营中心</div>
          </div>
        </div>
      </div>
    </header>
  )
}
