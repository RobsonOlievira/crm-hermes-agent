'use client'

import { cn } from '@/lib/utils'
import { LEAD_STATUS_META, CLIENT_STATUS_META } from '@/lib/crm-constants'

export function LeadStatusBadge({ status }: { status: string }) {
  const meta = LEAD_STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', meta?.bg, meta?.text)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta?.color }} />
      {meta?.label ?? status}
    </span>
  )
}

export function ClientStatusBadge({ status }: { status: string }) {
  const meta = CLIENT_STATUS_META[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', meta?.bg, meta?.text)}>
      {meta?.label ?? status}
    </span>
  )
}
