import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Step {
  key: string
  title: string
  icon?: ReactNode
  done?: boolean
  active?: boolean
  error?: boolean
}

interface Props {
  steps: Step[]
  className?: string
}

export default function Stepper({ steps, className }: Props) {
  return (
    <div className={cn('flex items-start gap-2 w-full overflow-x-auto scrollbar-thin pb-1', className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        return (
          <div key={s.key} className="flex items-start shrink-0">
            <div className="flex flex-col items-center gap-2 min-w-[110px] max-w-[140px]">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 shrink-0 transition-all',
                  s.done && 'bg-emerald-600 border-emerald-600 text-white',
                  s.active && 'bg-brand-600 border-brand-600 text-white ring-4 ring-brand-100',
                  s.error && 'bg-red-600 border-red-600 text-white',
                  !s.done && !s.active && !s.error && 'bg-white border-slate-300 text-slate-400',
                )}
              >
                {s.done && !s.error ? (
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.icon || i + 1
                )}
              </div>
              <div
                className={cn(
                  'text-xs text-center font-medium leading-tight',
                  s.active && 'text-brand-700',
                  s.done && !s.active && 'text-slate-600',
                  !s.done && !s.active && 'text-slate-400',
                )}
              >
                {s.title}
              </div>
            </div>
            {!last && (
              <div className="mt-4 mx-2 h-0.5 w-10 shrink-0 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    s.done ? 'w-full bg-emerald-500' : 'w-0',
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
