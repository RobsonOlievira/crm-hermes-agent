'use client'

import { DollarSign, Users, Target, TrendingUp, Award, Percent } from 'lucide-react'

interface KpiData {
  totalSpend: number
  totalLeads: number
  totalConversions: number
  totalRevenue: number
  avgCPL: number
  avgCAC: number
  roi: number
  roas: number
  conversionRate: number
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function AdsKpiCards({ kpis }: { kpis: KpiData }) {
  const cards = [
    {
      title: 'Gasto Total',
      value: fmtMoney(kpis.totalSpend),
      description: 'Investimento acumulado em mídia',
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Leads Atribuídos',
      value: kpis.totalLeads.toLocaleString('pt-BR'),
      description: 'Contatos originados por anúncios',
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      title: 'Custo por Lead (CPL)',
      value: fmtMoney(kpis.avgCPL),
      description: 'Média de custo para cada lead',
      icon: Target,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      title: 'Custo Aquisição (CAC)',
      value: fmtMoney(kpis.avgCAC),
      description: 'Média por cliente convertido',
      icon: TrendingUp,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    },
    {
      title: 'Conversões (Vendas)',
      value: `${kpis.totalConversions} (${kpis.conversionRate.toFixed(1)}%)`,
      description: 'Leads que fecharam negócio',
      icon: Award,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'ROI (Retorno)',
      value: `${kpis.roi.toFixed(1)}%`,
      description: `Receita: ${fmtMoney(kpis.totalRevenue)} (ROAS: ${kpis.roas.toFixed(2)}x)`,
      icon: Percent,
      color: kpis.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      bg: kpis.roi >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="rounded-xl border p-4 shadow-sm bg-card text-card-foreground dark:border-gray-700 dark:bg-gray-900/40 flex flex-col justify-between transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
