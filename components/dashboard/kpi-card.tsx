'use client'

import { Card } from '@/components/ui/card'
import { Icon } from '@/components/layout/icon'
import { useCountUp } from '@/hooks/use-count-up'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Kpi {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  delta: number
  icon: string
  accent: string
}

function formatValue(v: number, prefix = '', suffix = '', decimals = 0) {
  const num = v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return `${prefix}${num}${suffix}`
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const animated = useCountUp(kpi.value)
  const positive = kpi.delta >= 0
  return (
    <Card className="relative overflow-hidden p-5 transition-shadow hover:shadow-[var(--shadow-md)]">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${kpi.accent}1a`, color: kpi.accent }}>
          <Icon name={kpi.icon} className="h-5 w-5" />
        </div>
        <span className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold', positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {positive ? '+' : ''}{kpi.delta}%
        </span>
      </div>
      <p className="mt-4 font-display text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
        {formatValue(animated, kpi.prefix, kpi.suffix, kpi.decimals)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{kpi.label}</p>
      <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-[0.07]" style={{ backgroundColor: kpi.accent }} />
    </Card>
  )
}
