'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Icon } from '@/components/layout/icon'
import { INTERACTION_META } from '@/lib/crm-constants'
import { formatDateTime, formatCurrency } from '@/lib/format'
import { Activity } from 'lucide-react'

export interface FeedItem {
  id: string
  type: string
  title: string
  content: string | null
  amount: number | null
  userName: string | null
  targetName: string | null
  createdAt: string
}

export function InteractionsFeed({ items }: { items: FeedItem[] }) {
  const [type, setType] = useState('all')

  const filtered = useMemo(() => {
    let list = items ?? []
    if (type !== 'all') list = list.filter((i) => i.type === type)
    return list
  }, [items, type])

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Atividades recentes</h3>
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(INTERACTION_META).map(([key, meta]) => (
              <SelectItem key={key} value={key}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(filtered?.length ?? 0) === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Nenhuma interação encontrada.</div>
      ) : (
        <div className="space-y-1">
          {(filtered ?? []).map((item, idx) => {
            const meta = INTERACTION_META[item.type]
            const isLast = idx === (filtered?.length ?? 0) - 1
            return (
              <div key={item.id} className="relative flex gap-3 pb-4">
                {!isLast && <span className="absolute left-[15px] top-8 h-full w-px bg-border" />}
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: (meta?.color ?? '#6B7280') + '1a', color: meta?.color ?? '#6B7280' }}
                >
                  <Icon name={meta?.icon ?? 'Activity'} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      {item.title}
                      {item.targetName && <span className="text-muted-foreground"> · {item.targetName}</span>}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                  </div>
                  {item.content && <p className="mt-0.5 text-sm text-muted-foreground">{item.content}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{meta?.label ?? item.type}</span>
                    {item.userName && <span className="text-xs text-muted-foreground">· {item.userName}</span>}
                    {item.amount != null && <span className="text-xs font-semibold text-emerald-600">{formatCurrency(item.amount)}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
