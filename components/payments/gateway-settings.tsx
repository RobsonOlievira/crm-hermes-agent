'use me'
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { CreditCard, Wallet, Banknote, HandCoins, Check, Settings, Copy } from 'lucide-react'

export function GatewaySettings() {
  const [configs, setConfigs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  const [formDisplayName, setFormDisplayName] = useState('')
  const [formIsSandbox, setFormIsSandbox] = useState(true)
  const [formApiKey, setFormApiKey] = useState('')
  const [formSecretKey, setFormSecretKey] = useState('')
  const [formWebhookSecret, setFormWebhookSecret] = useState('')
  const [formAccessToken, setFormAccessToken] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    try {
      setLoading(true)
      const res = await fetch('/api/payments/gateways')
      const json = await res.json()
      if (json.configs) setConfigs(json.configs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenConfig(provider: string) {
    setSelectedProvider(provider)
    const existing = configs.find((c) => c.provider === provider)
    if (existing) {
      setFormDisplayName(existing.displayName || provider)
      setFormIsSandbox(existing.isSandbox ?? true)
    } else {
      setFormDisplayName(provider)
      setFormIsSandbox(true)
    }
    setFormApiKey('')
    setFormSecretKey('')
    setFormWebhookSecret('')
    setFormAccessToken('')
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProvider) return

    try {
      setSubmitting(true)
      await fetch('/api/payments/gateways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          displayName: formDisplayName,
          isSandbox: formIsSandbox,
          apiKey: formApiKey || undefined,
          secretKey: formSecretKey || undefined,
          webhookSecret: formWebhookSecret || undefined,
          accessToken: formAccessToken || undefined,
        }),
      })
      setSelectedProvider(null)
      fetchConfigs()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const providers = [
    {
      key: 'STRIPE',
      name: 'Stripe',
      icon: CreditCard,
      color: 'text-indigo-500',
      description: 'Ideal para cartões de crédito globais, assinaturas e PIX nativo.',
    },
    {
      key: 'MERCADO_PAGO',
      name: 'Mercado Pago',
      icon: Wallet,
      color: 'text-sky-500',
      description: 'Checkout completo no Brasil: PIX copia-e-cola, cartões e boleto.',
    },
    {
      key: 'ASAAS',
      name: 'Asaas',
      icon: Banknote,
      color: 'text-slate-800 dark:text-slate-200',
      description: 'Especializado em cobranças recorrentes, PIX e boletos para PMEs.',
    },
    {
      key: 'MANUAL',
      name: 'Manual / Outros',
      icon: HandCoins,
      color: 'text-emerald-500',
      description: 'Registre recebimentos manuais (dinheiro, PIX direto, transferência).',
    },
  ]

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold">Gateways de Pagamento Integrados</h3>
        <p className="text-sm text-muted-foreground">
          Configure as credenciais dos gateways para processar cobranças e assinaturas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => {
          const config = configs.find((c) => c.provider === p.key)
          const Icon = p.icon
          const webhookUrl = `${origin}/api/payments/webhooks/${p.key.toLowerCase()}`

          return (
            <Card key={p.key} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${p.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription className="text-xs">{p.description}</CardDescription>
                    </div>
                  </div>
                  {config?.isActive ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {config && (
                  <div className="bg-muted p-2 rounded flex justify-between items-center">
                    <span>Ambiente: <strong>{config.isSandbox ? 'Sandbox (Teste)' : 'Produção'}</strong></span>
                    <span>Moeda: {config.defaultCurrency}</span>
                  </div>
                )}
                {p.key !== 'MANUAL' && (
                  <div className="space-y-1 pt-1">
                    <div className="text-muted-foreground font-semibold">URL de Webhook:</div>
                    <div className="flex items-center gap-1 bg-muted/60 p-1.5 rounded font-mono text-[11px] overflow-hidden">
                      <span className="truncate flex-1">{webhookUrl}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(webhookUrl)
                          setCopiedUrl(p.key)
                          setTimeout(() => setCopiedUrl(null), 2000)
                        }}
                      >
                        {copiedUrl === p.key ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" size="sm" className="w-full flex gap-2" onClick={() => handleOpenConfig(p.key)}>
                  <Settings className="h-4 w-4" />
                  {config ? 'Editar Configurações' : 'Configurar Gateway'}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Modal de Configuração do Gateway */}
      {selectedProvider && (
        <Dialog open={!!selectedProvider} onOpenChange={() => setSelectedProvider(null)}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Configurar {selectedProvider}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveConfig} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome de Exibição</label>
                <Input
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="Ex: Stripe Produção"
                />
              </div>

              <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Modo Sandbox / Teste</div>
                  <div className="text-xs text-muted-foreground">Usar credenciais de ambiente de testes</div>
                </div>
                <Switch checked={formIsSandbox} onCheckedChange={setFormIsSandbox} />
              </div>

              {selectedProvider === 'STRIPE' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Secret Key (sk_test... ou sk_live...)</label>
                    <Input
                      type="password"
                      placeholder="Deixe em branco para manter a atual"
                      value={formSecretKey}
                      onChange={(e) => setFormSecretKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Webhook Secret (whsec_...)</label>
                    <Input
                      type="password"
                      placeholder="Deixe em branco para manter o atual"
                      value={formWebhookSecret}
                      onChange={(e) => setFormWebhookSecret(e.target.value)}
                    />
                  </div>
                </>
              )}

              {(selectedProvider === 'MERCADO_PAGO' || selectedProvider === 'ASAAS') && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Access Token / API Key</label>
                    <Input
                      type="password"
                      placeholder="Deixe em branco para manter o atual"
                      value={formAccessToken}
                      onChange={(e) => setFormAccessToken(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Webhook Secret (opcional)</label>
                    <Input
                      type="password"
                      placeholder="Deixe em branco se não houver"
                      value={formWebhookSecret}
                      onChange={(e) => setFormWebhookSecret(e.target.value)}
                    />
                  </div>
                </>
              )}

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
