'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard, Kpi } from './kpi-card'
import { LeadsLineChart, RevenueBarChart, SourcePieChart } from './charts'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate'
import { LEAD_STATUS_META } from '@/lib/crm-constants'
import { useViewRole } from '@/components/providers/view-role-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
  { key: 'year', label: 'Ano' },
] as const

export type PeriodKey = (typeof PERIODS)[number]['key']

export interface PeriodMetric {
  newLeads: number
  conversions: number
  revenue: number
  ticket: number
  deltas: number[]
  leadsSeries: { label: string; leads: number }[]
  revenueSeries: { label: string; receita: number }[]
}

export interface DashboardData {
  periods: { today: PeriodMetric; week: PeriodMetric; month: PeriodMetric; year: PeriodMetric }
  funnel: { status: string; count: number }[]
  sources: { name: string; value: number }[]
  team: { name: string; avatarUrl: string | null; leads: number; conversion: number }[]
  clientsAtivos: number
}

export function DashboardView({ data }: { data: DashboardData }) {
  const [period, setPeriod] = useState<PeriodKey>('month')
  const { viewRole } = useViewRole()

  const metric: PeriodMetric = data.periods[period] ?? data.periods.month

  const kpis: Kpi[] = useMemo(() => {
    return [
      { label: 'Leads Novos', value: metric.newLeads, delta: metric.deltas[0], icon: 'Users', accent: '#3B82F6' },
      { label: 'Conversões', value: metric.conversions, delta: metric.deltas[1], icon: 'CheckSquare', accent: '#10B981' },
      { label: 'Receita', value: metric.revenue, prefix: 'R$ ', delta: metric.deltas[2], icon: 'CreditCard', accent: '#8B5CF6' },
      { label: 'Ticket Médio', value: metric.ticket, prefix: 'R$ ', delta: metric.deltas[3], icon: 'TrendingUp', accent: '#F59E0B' },
      { label: 'Clientes ativos', value: data.clientsAtivos, delta: 0, icon: 'Building2', accent: '#06B6D4' },
    ]
  }, [metric, data.clientsAtivos])

  const maxFunnel = Math.max(...data.funnel.map((f) => f.count), 1)

  const hasLeads = data.sources.length > 0

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

      {/* Period note */}
      <FadeIn>
        <p className="text-sm text-muted-foreground">
          Dados do período {PERIODS.find((p) => p.key === period)?.label.toLowerCase()}. Fonte: dados reais do CRM.
        </p>
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
            <CardContent className="h-64 pl-0">
              {hasLeads ? <LeadsLineChart data={metric.leadsSeries} /> : <EmptyChart text="Sem leads neste período" />}
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn>
          <Card className="p-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Leads por origem</CardTitle></CardHeader>
            <CardContent className="h-64">
              {hasLeads ? <SourcePieChart data={data.sources} /> : <EmptyChart text="Sem leads cadastrados" />}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeIn>
          <Card className="p-1">
            <CardHeader className="pb-2"><CardTitle className="text-base">Receita por período</CardTitle></CardHeader>
            <CardContent className="h-64">
              <RevenueBarChart data={metric.revenueSeries} />
            </CardContent>
          </Card>
        </FadeIn>

        {/* Funnel */}
        <FadeIn className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Funil de conversão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.funnel.some((f) => f.count > 0) ? (
                data.funnel.map((f) => {
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
                })
              ) : (
                <EmptyChart text="Sem leads no funil" />
              )}
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
                {data.team.length === 0 ? (
                  <EmptyChart text="Sem membros na equipe" />
                ) : (
                  data.team.map((t) => (
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">{text}</div>
}