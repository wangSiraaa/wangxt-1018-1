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
  size?: 'md' | 'sm'
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
  size = 'md',
}: Props) {
  const toneMap: Record<string, string> = {
    brand: 'from-brand-500 to-brand-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    sky: 'from-sky-500 to-sky-600',
    teal: 'from-teal-500 to-teal-600',
    slate: 'from-slate-500 to-slate-600',
  }
  const actualAccent = tone ? (toneMap[tone] || accent) : accent
  const actualTitle = label || title

  const sizeStyles = {
    md: {
      card: 'p-5',
      title: 'text-xs',
      value: 'text-3xl',
      icon: 'w-11 h-11',
      blur: '-top-12 -right-12 w-32 h-32',
    },
    sm: {
      card: 'p-3',
      title: 'text-[10px]',
      value: 'text-xl',
      icon: 'w-7 h-7',
      blur: '-top-6 -right-6 w-20 h-20',
    },
  }
  const styles = sizeStyles[size]

  return (
    <div
      className={cn(
        'card relative overflow-hidden hover:shadow-md transition-shadow',
        styles.card,
        className,
      )}
    >
      <div
        className={cn(
          'absolute rounded-full bg-gradient-to-br opacity-10 blur-2xl',
          styles.blur,
          actualAccent,
        )}
      />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div
            className={cn(
              'font-medium text-slate-500 uppercase tracking-wide',
              styles.title,
            )}
          >
            {actualTitle}
          </div>
          <div
            className={cn(
              'mt-1 font-bold text-slate-800 tabular-nums',
              styles.value,
            )}
          >
            {value}
          </div>
          {delta && (
            <div
              className={cn(
                'mt-1 text-xs font-medium inline-flex items-center gap-1',
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
              'shrink-0 rounded-xl bg-gradient-to-br text-white flex items-center justify-center shadow-md',
              styles.icon,
              actualAccent,
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {children && <div className="mt-3 relative">{children}</div>}
    </div>
  )
}
