import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  className?: string
}

export function PageHeader({ children, className }: Props) {
  return <div className={cn('mb-6 flex items-end justify-between gap-4', className)}>{children}</div>
}

export function PageTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold text-slate-800 truncate">{title}</h1>
      {desc && <div className="mt-1 text-sm text-slate-500">{desc}</div>}
    </div>
  )
}

export function PageActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 shrink-0">{children}</div>
}
