'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Facebook, Chrome, CheckCircle2, AlertCircle, RefreshCw, Plus } from 'lucide-react'

export interface AdAccountRow {
  id: string
  platform: 'META' | 'GOOGLE'
  externalId: string
  name: string
  currency: string
  isActive: boolean
  lastSyncAt: string | null
  syncError: string | null
  _count?: { campaigns: number }
}

export function AdsConnectAccount({
  accounts,
  onRefresh,
}: {
  accounts: AdAccountRow[]
  onRefresh?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [platform, setPlatform] = useState<'META' | 'GOOGLE'>('META')
  const [name, setName] = useState('')
  const [externalId, setExternalId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !externalId.trim()) return

    setLoading(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/ads/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          name: name.trim(),
          externalId: externalId.trim(),
          accessToken: accessToken.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Erro ao conectar conta' })
      } else {
        setFeedback({ type: 'success', message: 'Conta conectada com sucesso!' })
        setName('')
        setExternalId('')
        setAccessToken('')
        setShowModal(false)
        onRefresh?.()
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro de conexão' })
    } finally {
      setLoading(false)
    }
  }

  const metaAccounts = accounts.filter((a) => a.platform === 'META')
  const googleAccounts = accounts.filter((a) => a.platform === 'GOOGLE')

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Grid de Canais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta Ads Card */}
        <div className="rounded-xl border p-6 bg-card dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Facebook className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Meta Ads</h3>
                <p className="text-xs text-muted-foreground">Facebook & Instagram Ads</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30">
              {metaAccounts.length} Conectada(s)
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Sincronize campanhas do gerenciador de anúncios do Facebook para calcular CPL, alcance e atribuição de leads.
          </p>

          {metaAccounts.length > 0 && (
            <div className="space-y-2 pt-2">
              {metaAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 dark:border-gray-700 text-xs"
                >
                  <div>
                    <span className="font-semibold block">{acc.name}</span>
                    <span className="text-muted-foreground">{acc.externalId}</span>
                  </div>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ativa ({acc._count?.campaigns || 0} campanhas)
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              setPlatform('META')
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Conectar Conta Meta Ads
          </Button>
        </div>

        {/* Google Ads Card */}
        <div className="rounded-xl border p-6 bg-card dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                <Chrome className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Google Ads</h3>
                <p className="text-xs text-muted-foreground">Pesquisa, Display e PMax</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30">
              {googleAccounts.length} Conectada(s)
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Acompanhe palavras-chave, cliques e taxa de conversão das suas campanhas do Google em tempo real.
          </p>

          {googleAccounts.length > 0 && (
            <div className="space-y-2 pt-2">
              {googleAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 dark:border-gray-700 text-xs"
                >
                  <div>
                    <span className="font-semibold block">{acc.name}</span>
                    <span className="text-muted-foreground">{acc.externalId}</span>
                  </div>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ativa ({acc._count?.campaigns || 0} campanhas)
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              setPlatform('GOOGLE')
              setShowModal(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Conectar Conta Google Ads
          </Button>
        </div>
      </div>

      {/* Modal / Form de Conexão */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card dark:bg-gray-900 border dark:border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">
              Conectar Conta {platform === 'META' ? 'Meta Ads' : 'Google Ads'}
            </h3>

            <form onSubmit={handleManualAdd} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Nome da Conta *</label>
                <Input
                  placeholder="Ex: Minha Empresa - Meta Ads"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">
                  ID da Conta na Plataforma ({platform === 'META' ? 'act_123456' : '123-456-7890'}) *
                </label>
                <Input
                  placeholder={platform === 'META' ? 'act_123456789' : '123-456-7890'}
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">Access Token / API Key (opcional para demo)</label>
                <Input
                  type="password"
                  placeholder="Token de Acesso da API"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar Conta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
