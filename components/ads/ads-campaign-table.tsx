'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Facebook, Chrome, Eye, Target, TrendingUp, DollarSign } from 'lucide-react'
import { AD_CAMPAIGN_STATUS_META, AD_OBJECTIVE_META } from '@/lib/crm-constants'

export interface CampaignRow {
  id: string
  externalId: string
  name: string
  platform: 'META' | 'GOOGLE'
  status: string
  objective: string | null
  dailyBudget: number | null
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalLeads: number
  totalConversions: number
  totalRevenue: number
  cpl: number
  cac: number
  roi: number
  accountName: string
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function AdsCampaignTable({
  campaigns,
  onSelectCampaign,
}: {
  campaigns: CampaignRow[]
  onSelectCampaign?: (c: CampaignRow) => void
}) {
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (platformFilter !== 'ALL' && c.platform !== platformFilter) return false
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || c.accountName.toLowerCase().includes(q)
      }
      return true
    })
  }, [campaigns, platformFilter, statusFilter, search])

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          >
            <option value="ALL">Todas as Plataformas</option>
            <option value="META">Meta Ads</option>
            <option value="GOOGLE">Google Ads</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativas</option>
            <option value="PAUSED">Pausadas</option>
            <option value="ARCHIVED">Arquivadas</option>
          </select>
        </div>
      </div>

      {/* Tabela de Campanhas */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 p-8 text-center">
          <Target className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma campanha encontrada com esses filtros</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border dark:border-gray-700 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 dark:bg-gray-900/50 dark:border-gray-700">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campanha</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Canal</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Investido</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Leads</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">CPL</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Vendas</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground font-semibold">ROI</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {filtered.map((c) => {
                const statusMeta = AD_CAMPAIGN_STATUS_META[c.status] || { label: c.status, color: 'bg-gray-100' }
                const objLabel = c.objective ? AD_OBJECTIVE_META[c.objective]?.label || c.objective : 'Geral'

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/30 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => onSelectCampaign?.(c)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground truncate max-w-[220px]">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.accountName} • {objLabel}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      {c.platform === 'META' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                          <Facebook className="h-3 w-3" /> Meta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium">
                          <Chrome className="h-3 w-3" /> Google
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-medium">{fmtMoney(c.totalSpend)}</td>

                    <td className="px-4 py-3 text-right hidden sm:table-cell">{c.totalLeads}</td>

                    <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">
                      {fmtMoney(c.cpl)}
                    </td>

                    <td className="px-4 py-3 text-right hidden lg:table-cell">{c.totalConversions}</td>

                    <td className="px-4 py-3 text-right font-bold">
                      <span className={c.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                        {c.roi.toFixed(1)}%
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectCampaign?.(c)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
