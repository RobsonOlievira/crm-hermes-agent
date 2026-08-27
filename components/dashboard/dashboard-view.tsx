'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard, Kpi } from './kpi-card'
import { LeadsLineChart, RevenueBarChart, SourcePieChart } from './charts'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { LEAD_STATUS_META } from '@/lib/crm-constants'
import { formatCurrency } from '@/lib/format'
import { useViewRole } from '@/components/providers/view-role-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year', label: 'Ano' },
] as const

type PeriodKey = typeof PERIODS[number]['key']

const LINE_DATA: Record<PeriodKey, { label: string; leads: number }[]> = {
  today: ['08h', '10h', '12h', '14h', '16h', '18h', '20h'].map((label, i) => ({ label, leads: [2, 5, 4, 8, 6, 9, 7][i] })),
  week: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, i) => ({ label, leads: [12, 18, 15, 22, 27, 14, 9][i] })),
  month: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map((label, i) => ({ label, leads: [48, 62, 55, 71][i] })),
  year: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((label, i) => ({ label, leads: [120, 145, 132, 168, 190, 175, 210, 198, 220, 205, 240, 260][i] })),
}
const REV_DATA: Record<PeriodKey, { label: string; receita: number }[]> = {
  today: ['08h', '12h', '16h', '20h'].map((label, i) => ({ label, receita: [1200, 3400, 2800, 4500][i] })),
  week: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, i) => ({ label, receita: [3200, 5400, 4100, 6800, 8900, 2100, 1500][i] })),
  month: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map((label, i) => ({ label, receita: [12400, 18600, 15200, 22800][i] })),
  year: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((label, i) => ({ label, receita: [32000, 41000, 38000, 52000, 61000, 55000, 72000, 68000, 81000, 76000, 92000, 105000][i] })),
}

const KPI_BASE: Record<PeriodKey, { newLeads: number; conversions: number; revenue: number; ticket: number; deltas: number[] }> = {
  today: { newLeads: 9, conversions: 2, revenue: 4500, ticket: 2250, deltas: [5, -2, 8, 3] },
  week: { newLeads: 117, conversions: 19, revenue: 31900, ticket: 1679, deltas: [12, 8, 15, -3] },
  month: { newLeads: 236, conversions: 41, revenue: 69000, ticket: 1683, deltas: [12, 8, 15, -3] },
  year: { newLeads: 2483, conversions: 387, revenue: 773000, ticket: 1997, deltas: [24, 18, 31, 6] },
}

export interface DashboardData {
  funnel: { status: string; count: number }[]
  sources: { name: string; value: number }[]
  team: { name: string; avatarUrl: string | null; leads: number; conversion: number }[]
}

export function DashboardView({ data }: { data: DashboardData }) {
  const [period, setPeriod] = useState<PeriodKey>('month')
  const { viewRole } = useViewRole()

  const kpis: Kpi[] = useMemo(() => {
    const b = KPI_BASE[period]
    return [
      { label: 'Leads Novos', value: b.newLeads, delta: b.deltas[0], icon: 'Users', accent: '#3B82F6' },
      { label: 'Conversões', value: b.conversions, delta: b.deltas[1], icon: 'CheckSquare', accent: '#10B981' },
      { label: 'Receita', value: b.revenue, prefix: 'R$ ', delta: b.deltas[2], icon: 'CreditCard', accent: '#8B5CF6' },
      { label: 'Ticket Médio', value: b.ticket, prefix: 'R$ ', delta: b.deltas[3], icon: 'TrendingUp', accent: '#F59E0B' },
    ]
  }, [period])

  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1)

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <FadeIn>
        <div className="flex items-center gap-1 rounded-xl border bg-card p-1 w-fit">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${period === p.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* KPIs */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <StaggerItem key={k.label}>
            <KpiCard kpi={k} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Leads por período</CardTitle></CardHeader>
            <CardContent className="h-64 pl-0"><LeadsLineChart data={LINE_DATA[period]} /></CardContent>
          </Card>
        </FadeIn>
        <FadeIn>
          <Card className="p-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Leads por origem</CardTitle></CardHeader>
            <CardContent className="h-64"><SourcePieChart data={data.sources} /></CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeIn>
          <Card className="p-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Receita por período</CardTitle></CardHeader>
            <CardContent className="h-64"><RevenueBarChart data={REV_DATA[period]} /></CardContent>
          </Card>
        </FadeIn>

        {/* Funnel */}
        <FadeIn className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Funil de conversão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.funnel.map((f) => {
                const meta = LEAD_STATUS_META[f.status]
                const pct = Math.round((f.count / maxFunnel) * 100)
                return (
                  <div key={f.status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{meta?.label ?? f.status}</span>
                      <span className="tabular-nums text-muted-foreground">{f.count} leads</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all duration-slow" style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: meta?.color ?? '#3B82F6' }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Team activity (hidden for MEMBER) */}
      {viewRole !== 'MEMBER' && (
        <FadeIn>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Atividade da equipe</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.team.map((t) => (
                  <div key={t.name} className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 transition-colors hover:bg-muted">
                    <Avatar className="h-9 w-9">
                      {t.avatarUrl && <AvatarImage src={t.avatarUrl} alt={t.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(t.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.leads} leads atribuídos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{t.conversion}%</p>
                      <p className="text-[11px] text-muted-foreground">conversão</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  )
}
