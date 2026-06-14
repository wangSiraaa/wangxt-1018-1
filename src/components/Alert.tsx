import { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'success' | 'warning' | 'error' | 'info'

interface Props {
  tone?: Tone
  title?: string
  children?: ReactNode
  onClose?: () => void
  className?: string
  dismissible?: boolean
}

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}
const colorMap = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
}
const iconColorMap = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  error: 'text-red-600',
  info: 'text-sky-600',
}

export default function Alert({
  tone = 'info',
  title,
  children,
  onClose,
  className,
  dismissible = true,
}: Props) {
  const Icon = iconMap[tone]
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border',
        colorMap[tone],
        className,
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColorMap[tone])} />
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
      {dismissible && onClose && (
        <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-black/5">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
