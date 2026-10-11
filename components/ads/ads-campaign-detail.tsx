'use client'

import { useState, useEffect } from 'react'
import { CampaignRow } from './ads-campaign-table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, DollarSign, Users, Target, TrendingUp, Award, Percent, Facebook, Chrome } from 'lucide-react'
import { AD_CAMPAIGN_STATUS_META } from '@/lib/crm-constants'

function fmtMoney(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function AdsCampaignDetail({
  campaign,
  onBack,
}: {
  campaign: CampaignRow
  onBack: () => void
}) {
  const statusMeta = AD_CAMPAIGN_STATUS_META[campaign.status] || { label: campaign.status, color: 'bg-neutral-100' }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Voltar para Campanhas
      </button>

      {/* Cabeçalho da Campanha */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b pb-4 dark:border-neutral-700">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {campaign.platform === 'META' ? (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                <Facebook className="h-3.5 w-3.5" /> Meta Ads
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium">
                <Chrome className="h-3.5 w-3.5" /> Google Ads
              </span>
            )}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{campaign.name}</h2>
          <p className="text-sm text-muted-foreground">
            ID Externo: {campaign.externalId} • Conta: {campaign.accountName}
          </p>
        </div>

        {campaign.dailyBudget && (
          <div className="rounded-lg border p-3 bg-muted/40 text-right dark:border-neutral-700">
            <span className="text-xs text-muted-foreground block">Orçamento Diário</span>
            <span className="font-bold text-base">{fmtMoney(campaign.dailyBudget)}</span>
          </div>
        )}
      </div>

      {/* Cards de Desempenho da Campanha */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border p-4 dark:border-neutral-700 bg-card">
          <span className="text-xs text-muted-foreground block mb-1">Investimento</span>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{fmtMoney(campaign.totalSpend)}</p>
        </div>

        <div className="rounded-xl border p-4 dark:border-neutral-700 bg-card">
          <span className="text-xs text-muted-foreground block mb-1">Leads Gerados</span>
          <p className="text-xl font-bold">{campaign.totalLeads}</p>
        </div>

        <div className="rounded-xl border p-4 dark:border-neutral-700 bg-card">
          <span className="text-xs text-muted-foreground block mb-1">CPL (Custo/Lead)</span>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{fmtMoney(campaign.cpl)}</p>
        </div>

        <div className="rounded-xl border p-4 dark:border-neutral-700 bg-card">
          <span className="text-xs text-muted-foreground block mb-1">ROI da Campanha</span>
          <p className={`text-xl font-bold ${campaign.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {campaign.roi.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Métricas Adicionais */}
      <div className="rounded-xl border p-5 space-y-3 dark:border-neutral-700 bg-card">
        <h3 className="font-semibold text-sm">Resumo de Mídia e Conversões</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground block">Impressões</span>
            <span className="font-semibold">{campaign.totalImpressions.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Cliques</span>
            <span className="font-semibold">{campaign.totalClicks.toLocaleString('pt-BR')}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Conversões (Clientes)</span>
            <span className="font-semibold">{campaign.totalConversions}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Receita Atribuída</span>
            <span className="font-semibold text-emerald-600">{fmtMoney(campaign.totalRevenue)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
