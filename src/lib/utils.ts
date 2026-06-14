import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayStr(): string {
  return formatDate(new Date().toISOString())
}

export function statusBadge(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    pending_approval: { label: '待审批', className: 'badge bg-amber-100 text-amber-800' },
    nda_pending: { label: 'NDA待签署', className: 'badge bg-purple-100 text-purple-800' },
    approved: { label: '已通过', className: 'badge bg-sky-100 text-sky-800' },
    rejected: { label: '已拒绝', className: 'badge bg-red-100 text-red-800' },
    waiting_list: { label: '候补中', className: 'badge bg-orange-100 text-orange-800' },
    checked_in: { label: '已签到', className: 'badge bg-green-100 text-green-800' },
    visiting: { label: '参观中', className: 'badge bg-blue-100 text-blue-800' },
    material_collected: { label: '物料已领', className: 'badge bg-teal-100 text-teal-800' },
    checked_out: { label: '已离场', className: 'badge bg-slate-100 text-slate-700' },
    cancelled: { label: '已取消', className: 'badge bg-gray-200 text-gray-600' },
    draft: { label: '草稿', className: 'badge bg-slate-100 text-slate-600' },
    published: { label: '已发布', className: 'badge bg-sky-100 text-sky-800' },
    in_progress: { label: '进行中', className: 'badge bg-green-100 text-green-800' },
    completed: { label: '已完成', className: 'badge bg-slate-100 text-slate-700' },
    pending: { label: '待处理', className: 'badge bg-amber-100 text-amber-800' },
  }
  return map[status] || { label: status, className: 'badge bg-slate-100 text-slate-700' }
}

export function maskId(idNumber: string): string {
  if (!idNumber || idNumber.length < 8) return idNumber
  return idNumber.slice(0, 4) + '********' + idNumber.slice(-4)
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}
