import { useState, useMemo } from 'react'
import { AlertTriangle, Clock, Shield, MapPin, Users, CalendarDays } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn, todayStr, formatDate } from '@/lib/utils'
import { PageHeader, PageTitle } from '@/components/PageHeader'
import StatCard from '@/components/StatCard'
import type { VisitBatch, Route, Guide } from '@/types'

export default function RouteSchedule() {
  const routes = useAppStore((s) => s.routes)
  const batches = useAppStore((s) => s.batches)
  const guides = useAppStore((s) => s.guides)
  const checkBatchConflicts = useAppStore((s) => s.checkBatchConflicts)
  const getBatchUsedCapacity = useAppStore((s) => s.getBatchUsedCapacity)

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayStr())

  const todayBatches = useMemo(
    () => batches.filter((b) => b.date === selectedDate && b.status !== 'cancelled'),
    [batches, selectedDate],
  )

  const batchConflicts = useMemo(() => {
    const map = new Map<string, boolean>()
    todayBatches.forEach((batch) => {
      const conflicts = checkBatchConflicts(
        {
          date: batch.date,
          startTime: batch.startTime,
          endTime: batch.endTime,
          guideId: batch.guideId,
          routeId: batch.routeId,
        },
        batch.id,
      )
      map.set(batch.id, conflicts.some((c) => c.level === 'error'))
    })
    return map
  }, [todayBatches, checkBatchConflicts])

  const selectedBatch = useMemo(
    () => todayBatches.find((b) => b.id === selectedBatchId),
    [todayBatches, selectedBatchId],
  )

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedBatch?.routeId),
    [routes, selectedBatch],
  )

  const selectedGuide = useMemo(
    () => guides.find((g) => g.id === selectedBatch?.guideId),
    [guides, selectedBatch],
  )

  const timeSlots = useMemo(() => {
    const slots = []
    for (let h = 8; h <= 18; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`)
    }
    return slots
  }, [])

  const getGuideSchedule = (guideId: string) => {
    return todayBatches.filter((b) => b.guideId === guideId).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle
          title="路线安排与讲解员排班"
          desc="管理参观路线、批次时间与讲解员分配，实时检测冲突"
        />
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSelectedBatchId(null)
            }}
            className="input w-auto"
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="今日批次"
          value={todayBatches.length}
          icon={<CalendarDays className="w-5 h-5" />}
          tone="sky"
        />
        <StatCard
          label="在线讲解员"
          value={guides.filter((g) => g.workDays.includes(new Date(selectedDate).getDay())).length}
          icon={<Users className="w-5 h-5" />}
          tone="emerald"
        />
        <StatCard
          label="路线总数"
          value={routes.length}
          icon={<MapPin className="w-5 h-5" />}
          tone="purple"
        />
        <StatCard
          label="冲突批次"
          value={Array.from(batchConflicts.values()).filter(Boolean).length}
          icon={<AlertTriangle className="w-5 h-5" />}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-4">
          <div className="text-sm font-semibold text-slate-600 mb-2">参观路线</div>
          {routes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              highlighted={selectedRoute?.id === route.id}
              onClick={() => {
                const batch = todayBatches.find((b) => b.routeId === route.id)
                if (batch) setSelectedBatchId(batch.id)
              }}
            />
          ))}
        </div>

        <div className="col-span-8 space-y-6">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-slate-700">
                {formatDate(selectedDate)} 批次时间轴
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {routes.map((r) => (
                  <div key={r.id} className="flex items-center gap-1">
                    <span className={cn('w-3 h-3 rounded-sm', r.color)} />
                    {r.name.replace('标准参观路线', '路线').replace('深度考察路线', '路线').replace('VIP专家路线', '路线')}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="flex border-b border-slate-200">
                <div className="w-16 shrink-0" />
                <div className="flex-1 flex">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot}
                      className="flex-1 text-xs text-slate-400 text-center py-2 border-l border-slate-100"
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[200px]">
                <div className="flex">
                  <div className="w-16 shrink-0" />
                  <div className="flex-1 relative">
                    <div className="absolute inset-0 flex">
                      {timeSlots.map((slot) => (
                        <div
                          key={slot}
                          className="flex-1 border-l border-slate-100"
                        />
                      ))}
                    </div>
                    <div className="relative py-4 space-y-3">
                      {todayBatches.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm">
                          {formatDate(selectedDate)} 暂无安排批次
                        </div>
                      ) : (
                        todayBatches.map((batch) => (
                          <BatchTimelineItem
                            key={batch.id}
                            batch={batch}
                            route={routes.find((r) => r.id === batch.routeId)!}
                            guide={guides.find((g) => g.id === batch.guideId)!}
                            usedCapacity={getBatchUsedCapacity(batch.id)}
                            hasConflict={batchConflicts.get(batch.id) || false}
                            selected={selectedBatchId === batch.id}
                            onClick={() => setSelectedBatchId(batch.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="text-sm font-semibold text-slate-700 mb-4">
              讲解员排班表 — {formatDate(selectedDate)}
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-32">讲解员</th>
                    <th>职务</th>
                    <th>排班时段</th>
                    <th>当日批次</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.map((guide) => {
                    const schedule = getGuideSchedule(guide.id)
                    const dayOfWeek = new Date(selectedDate).getDay()
                    const isWorking = guide.workDays.includes(dayOfWeek)
                    return (
                      <tr key={guide.id} className={!isWorking ? 'bg-slate-50/50' : ''}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-medium">
                              {guide.name[0]}
                            </div>
                            <span className="font-medium">{guide.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-slate-500">{guide.title}</span>
                          {!isWorking && (
                            <span className="ml-2 badge bg-slate-100 text-slate-500">休息</span>
                          )}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {schedule.length === 0 ? (
                              <span className="text-slate-400 text-xs">—</span>
                            ) : (
                              schedule.map((b) => {
                                const route = routes.find((r) => r.id === b.routeId)
                                return (
                                  <span
                                    key={b.id}
                                    onClick={() => setSelectedBatchId(b.id)}
                                    className={cn(
                                      'cursor-pointer badge',
                                      route?.color || 'bg-slate-100',
                                      selectedBatchId === b.id ? 'ring-2 ring-offset-1 ring-brand-500' : '',
                                      'text-white',
                                    )}
                                  >
                                    {b.startTime}-{b.endTime}
                                  </span>
                                )
                              })
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="font-medium text-slate-700">{schedule.length}</span>
                          <span className="text-slate-400 text-xs ml-1">个批次</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {selectedBatch && (
            <div className="card p-5 border-2 border-brand-200 bg-brand-50/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-lg font-semibold text-slate-800">{selectedBatch.name}</div>
                  <div className="text-sm text-slate-500 mt-0.5">{selectedBatch.code}</div>
                </div>
                <span className={cn('badge', selectedRoute?.color, 'text-white')}>
                  {selectedRoute?.name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-500 mb-1">时间</div>
                  <div className="font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {selectedBatch.startTime} - {selectedBatch.endTime}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">讲解员</div>
                  <div className="font-medium flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    {selectedGuide?.name} ({selectedGuide?.title})
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">容量</div>
                  <div className="font-medium">
                    {getBatchUsedCapacity(selectedBatch.id)} / {selectedBatch.capacity} 人
                  </div>
                </div>
              </div>
              {selectedRoute && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-slate-500 text-sm mb-2">路线展区</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoute.zones.map((zone) => (
                      <span
                        key={zone.id}
                        className={cn(
                          'badge',
                          zone.isSecret
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {zone.isSecret && <Shield className="w-3 h-3 mr-0.5" />}
                        {zone.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RouteCard({
  route,
  highlighted,
  onClick,
}: {
  route: Route
  highlighted: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'card p-4 cursor-pointer transition-all hover:shadow-md',
        highlighted ? 'ring-2 ring-offset-2 ring-brand-500 shadow-md' : '',
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className={cn('w-3 h-3 rounded-full shrink-0 mt-1.5', route.color)} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 truncate">{route.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">{route.description}</div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {route.durationMinutes}分钟
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {route.zones.length}个展区
        </span>
        {route.requiresNda && (
          <span className="badge bg-red-100 text-red-700">
            <Shield className="w-3 h-3 mr-0.5" />
            需NDA
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {route.zones.map((zone, idx) => (
          <div key={zone.id} className="flex items-center gap-2 text-xs">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-medium shrink-0">
              {idx + 1}
            </span>
            <span className={zone.isSecret ? 'text-red-600 font-medium' : 'text-slate-600'}>
              {zone.name}
            </span>
            {zone.isSecret && (
              <span className="badge bg-red-50 text-red-600 text-[10px] !py-0">涉密</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function BatchTimelineItem({
  batch,
  route,
  guide,
  usedCapacity,
  hasConflict,
  selected,
  onClick,
}: {
  batch: VisitBatch
  route: Route
  guide: Guide
  usedCapacity: number
  hasConflict: boolean
  selected: boolean
  onClick: () => void
}) {
  const startHour = parseInt(batch.startTime.split(':')[0])
  const startMin = parseInt(batch.startTime.split(':')[1])
  const endHour = parseInt(batch.endTime.split(':')[0])
  const endMin = parseInt(batch.endTime.split(':')[1])
  const startPercent = ((startHour - 8) * 60 + startMin) / (11 * 60) * 100
  const widthPercent = ((endHour - startHour) * 60 + (endMin - startMin)) / (11 * 60) * 100

  return (
    <div className="relative h-16">
      <div className="absolute left-0 w-16 pr-3 text-right text-xs text-slate-500 pt-1.5">
        {batch.startTime}
      </div>
      <div className="absolute left-16 right-0 h-full">
        <div
          onClick={onClick}
          className={cn(
            'absolute top-0 bottom-0 rounded-lg px-3 py-2 cursor-pointer transition-all overflow-hidden',
            route.color,
            'text-white',
            selected ? 'ring-2 ring-offset-2 ring-brand-500 shadow-lg scale-[1.02]' : 'hover:shadow-md hover:brightness-105',
          )}
          style={{
            left: `${Math.max(0, startPercent)}%`,
            width: `${Math.max(8, widthPercent)}%`,
          }}
        >
          <div className="flex items-center gap-2 h-full">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{batch.name}</div>
              <div className="text-xs opacity-90 truncate">
                {guide.name} · {usedCapacity}/{batch.capacity}人
              </div>
            </div>
            {hasConflict && (
              <div className="shrink-0 relative">
                <AlertTriangle className="w-5 h-5 text-yellow-200 fill-red-500" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
