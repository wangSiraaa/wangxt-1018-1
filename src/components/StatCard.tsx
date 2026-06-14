import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  icon?: ReactNode
  value: ReactNode
  delta?: ReactNode
  deltaTone?: 'positive' | 'negative' | 'neutral'
  children?: ReactNode
  className?: string
  accent?: string
  label?: string
  tone?: string
}

export default function StatCard({
  title,
  icon,
  value,
  delta,
  deltaTone = 'neutral',
  children,
  className,
  accent = 'from-brand-500 to-brand-600',
  label,
  tone,
}: Props) {
  const toneMap: Record<string, string> = {
    brand: 'from-brand-500 to-brand-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    sky: 'from-sky-500 to-sky-600',
    teal: 'from-teal-500 to-teal-600',
  }
  const actualAccent = tone ? (toneMap[tone] || accent) : accent
  const actualTitle = label || title
  return (
    <div
      className={cn(
        'card p-5 relative overflow-hidden hover:shadow-md transition-shadow',
        className,
      )}
    >
      <div
        className={cn(
          'absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl',
          actualAccent,
        )}
      />
      <div className="flex items-start justify-between gap-3 relative">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {actualTitle}
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-800 tabular-nums">{value}</div>
          {delta && (
            <div
              className={cn(
                'mt-2 text-xs font-medium inline-flex items-center gap-1',
                deltaTone === 'positive' && 'text-emerald-600',
                deltaTone === 'negative' && 'text-red-600',
                deltaTone === 'neutral' && 'text-slate-500',
              )}
            >
              {delta}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-md',
              actualAccent,
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {children && <div className="mt-4 relative">{children}</div>}
    </div>
  )
}
