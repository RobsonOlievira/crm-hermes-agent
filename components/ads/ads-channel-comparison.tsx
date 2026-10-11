'use client'

import { Facebook, Chrome } from 'lucide-react'

interface PlatformSummary {
  platform: 'META' | 'GOOGLE'
  spend: number
  leads: number
  conversions: number
  revenue: number
  cpl: number
  cac: number
  roi: number
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function AdsChannelComparison({ data }: { data: PlatformSummary[] }) {
  const meta = data.find((d) => d.platform === 'META') || {
    platform: 'META' as const,
    spend: 0,
    leads: 0,
    conversions: 0,
    revenue: 0,
    cpl: 0,
    cac: 0,
    roi: 0,
  }
  const google = data.find((d) => d.platform === 'GOOGLE') || {
    platform: 'GOOGLE' as const,
    spend: 0,
    leads: 0,
    conversions: 0,
    revenue: 0,
    cpl: 0,
    cac: 0,
    roi: 0,
  }

  const totalSpend = (meta.spend + google.spend) || 1
  const metaPct = Math.round((meta.spend / totalSpend) * 100)
  const googlePct = Math.round((google.spend / totalSpend) * 100)

  return (
    <div className="rounded-xl border p-5 bg-card dark:border-neutral-700 dark:bg-neutral-900/40 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Comparação de Canais</h3>
          <p className="text-xs text-muted-foreground">Meta Ads vs Google Ads</p>
        </div>
      </div>

      {/* Barra de Distribuição de Investimento */}
      <div>
        <div className="flex justify-between text-xs font-medium mb-1.5">
          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Facebook className="h-3.5 w-3.5" /> Meta Ads ({metaPct}%)
          </span>
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <Chrome className="h-3.5 w-3.5" /> Google Ads ({googlePct}%)
          </span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden flex">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${metaPct}%` }}
            title={`Meta Ads: ${fmtMoney(meta.spend)}`}
          />
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${googlePct}%` }}
            title={`Google Ads: ${fmtMoney(google.spend)}`}
          />
        </div>
      </div>

      {/* Tabela comparativa lado a lado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* Card Meta */}
        <div className="rounded-lg border p-4 bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40 space-y-2">
          <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-blue-700 dark:text-blue-300">
              <Facebook className="h-4 w-4" /> Meta Ads
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
              {fmtMoney(meta.spend)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">Leads</span>
              <span className="font-semibold text-sm">{meta.leads}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">CPL Médio</span>
              <span className="font-semibold text-sm">{fmtMoney(meta.cpl)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Conversões</span>
              <span className="font-semibold text-sm">{meta.conversions}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">ROI</span>
              <span className={`font-semibold text-sm ${meta.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {meta.roi.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Card Google */}
        <div className="rounded-lg border p-4 bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/40 space-y-2">
          <div className="flex items-center justify-between border-b border-red-100 dark:border-red-900/40 pb-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-red-700 dark:text-red-300">
              <Chrome className="h-4 w-4" /> Google Ads
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
              {fmtMoney(google.spend)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground block">Leads</span>
              <span className="font-semibold text-sm">{google.leads}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">CPL Médio</span>
              <span className="font-semibold text-sm">{fmtMoney(google.cpl)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Conversões</span>
              <span className="font-semibold text-sm">{google.conversions}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">ROI</span>
              <span className={`font-semibold text-sm ${google.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {google.roi.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
