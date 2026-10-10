'use client'

import { useState, useEffect } from 'react'
import { AdsKpiCards } from './ads-kpi-cards'
import { AdsChannelComparison } from './ads-channel-comparison'
import { AdsCampaignTable, CampaignRow } from './ads-campaign-table'
import { AdsCampaignDetail } from './ads-campaign-detail'
import { AdsAlertsPanel, AdAlertRow } from './ads-alerts-panel'
import { AdsConnectAccount, AdAccountRow } from './ads-connect-account'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Target, Bell, Settings, RefreshCw, Megaphone } from 'lucide-react'

type TabView = 'dashboard' | 'campaigns' | 'alerts' | 'accounts'

export function AdsDashboard({
  initialKpis,
  initialCampaigns,
  initialAlerts,
  initialAccounts,
}: {
  initialKpis?: any
  initialCampaigns?: CampaignRow[]
  initialAlerts?: AdAlertRow[]
  initialAccounts?: AdAccountRow[]
}) {
  const [currentTab, setCurrentTab] = useState<TabView>('dashboard')
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null)
  const [period, setPeriod] = useState<string>('30d')
  const [loading, setLoading] = useState<boolean>(false)

  const [kpis, setKpis] = useState(
    initialKpis || {
      totalSpend: 0,
      totalLeads: 0,
      totalConversions: 0,
      totalRevenue: 0,
      avgCPL: 0,
      avgCAC: 0,
      roi: 0,
      roas: 0,
      conversionRate: 0,
    }
  )
  const [byPlatform, setByPlatform] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRow[]>(initialCampaigns || [])
  const [alerts, setAlerts] = useState<AdAlertRow[]>(initialAlerts || [])
  const [accounts, setAccounts] = useState<AdAccountRow[]>(initialAccounts || [])

  // Carregar dados atualizados do dashboard
  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [dashRes, campRes, alertRes, accRes] = await Promise.all([
        fetch(`/api/ads/dashboard?period=${period}`).then((r) => r.json()),
        fetch(`/api/ads/campaigns`).then((r) => r.json()),
        fetch(`/api/ads/alerts`).then((r) => r.json()),
        fetch(`/api/ads/accounts`).then((r) => r.json()),
      ])

      if (dashRes.kpis) {
        setKpis(dashRes.kpis)
        setByPlatform(dashRes.byPlatform || [])
      }
      if (campRes.campaigns) setCampaigns(campRes.campaigns)
      if (alertRes.alerts) setAlerts(alertRes.alerts)
      if (accRes.accounts) setAccounts(accRes.accounts)
    } catch (e) {
      console.error('Erro ao recarregar dados de tráfego pago:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [period])

  const handleSync = async () => {
    setLoading(true)
    try {
      await fetch('/api/ads/sync', { method: 'POST' })
      await fetchDashboardData()
    } finally {
      setLoading(false)
    }
  }

  const unreadAlertsCount = alerts.filter((a) => !a.isRead).length

  return (
    <div className="space-y-6">
      {/* Barra de Topo do Módulo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tráfego Pago</h1>
            <p className="text-xs text-muted-foreground">
              Acompanhe o ROI, CPL e CAC das suas campanhas de anúncios em tempo real.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Período */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>

          <Button size="sm" variant="outline" onClick={handleSync} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Sincronizar
          </Button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-1 border-b dark:border-gray-700 pb-2">
        <button
          onClick={() => {
            setSelectedCampaign(null)
            setCurrentTab('dashboard')
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            currentTab === 'dashboard'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" /> Visão Geral
        </button>

        <button
          onClick={() => {
            setSelectedCampaign(null)
            setCurrentTab('campaigns')
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            currentTab === 'campaigns'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Target className="h-4 w-4" /> Campanhas ({campaigns.length})
        </button>

        <button
          onClick={() => {
            setSelectedCampaign(null)
            setCurrentTab('alerts')
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors relative ${
            currentTab === 'alerts'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Bell className="h-4 w-4" /> Alertas
          {unreadAlertsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setSelectedCampaign(null)
            setCurrentTab('accounts')
          }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
            currentTab === 'accounts'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Settings className="h-4 w-4" /> Contas Conectadas ({accounts.length})
        </button>
      </div>

      {/* Conteúdo da Aba Selecionada */}
      {selectedCampaign ? (
        <AdsCampaignDetail campaign={selectedCampaign} onBack={() => setSelectedCampaign(null)} />
      ) : currentTab === 'dashboard' ? (
        <div className="space-y-6">
          <AdsKpiCards kpis={kpis} />
          <AdsChannelComparison data={byPlatform} />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Top Campanhas por Investimento</h3>
              <Button size="sm" variant="ghost" onClick={() => setCurrentTab('campaigns')}>
                Ver todas ({campaigns.length}) →
              </Button>
            </div>
            <AdsCampaignTable
              campaigns={campaigns.slice(0, 5)}
              onSelectCampaign={(c) => setSelectedCampaign(c)}
            />
          </div>
        </div>
      ) : currentTab === 'campaigns' ? (
        <AdsCampaignTable
          campaigns={campaigns}
          onSelectCampaign={(c) => setSelectedCampaign(c)}
        />
      ) : currentTab === 'alerts' ? (
        <AdsAlertsPanel alerts={alerts} onRefresh={fetchDashboardData} />
      ) : (
        <AdsConnectAccount accounts={accounts} onRefresh={fetchDashboardData} />
      )}
    </div>
  )
}
