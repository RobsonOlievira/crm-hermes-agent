'use client'

import { useState } from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { ALERT_SEVERITY_META } from '@/lib/crm-constants'
import { Button } from '@/components/ui/button'

export interface AdAlertRow {
  id: string
  campaignId: string
  type: string
  message: string
  severity: 'info' | 'warning' | 'critical' | string
  isRead: boolean
  triggeredAt: string
  campaign?: { id: string; name: string; platform: string }
}

export function AdsAlertsPanel({
  alerts: initialAlerts,
  onRefresh,
}: {
  alerts: AdAlertRow[]
  onRefresh?: () => void
}) {
  const [alerts, setAlerts] = useState<AdAlertRow[]>(initialAlerts)

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/ads/alerts/${id}/read`, { method: 'PATCH' })
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)))
        onRefresh?.()
      }
    } catch (e) {
      console.error('Erro ao marcar alerta como lido:', e)
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 p-8 text-center">
        <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
        <p className="font-medium text-sm">Nenhum alerta pendente</p>
        <p className="text-xs text-muted-foreground">Sua conta de anúncios está rodando dentro do esperado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const severityMeta = ALERT_SEVERITY_META[alert.severity] || ALERT_SEVERITY_META.warning

        return (
          <div
            key={alert.id}
            className={`rounded-xl border p-4 flex items-start justify-between gap-3 transition-all ${
              alert.isRead
                ? 'opacity-60 bg-card dark:border-neutral-800'
                : 'bg-card shadow-sm dark:border-neutral-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {alert.severity === 'critical' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : alert.severity === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                ) : (
                  <Info className="h-5 w-5 text-blue-500" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityMeta.color}`}>
                    {severityMeta.label}
                  </span>
                  {alert.campaign && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {alert.campaign.name}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(alert.triggeredAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {!alert.isRead && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markAsRead(alert.id)}
                className="text-xs shrink-0"
              >
                Marcar lido
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
