'use me'
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUBSCRIPTION_STATUS_META, PAYMENT_PROVIDER_META, INTERVAL_TYPE_META } from '@/lib/crm-constants'
import { Search, Plus, PauseCircle, PlayCircle, XCircle } from 'lucide-react'

export function SubscriptionsList() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [openModal, setOpenModal] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [catalogItems, setCatalogItems] = useState<any[]>([])

  const [formLeadId, setFormLeadId] = useState('')
  const [formPlanName, setFormPlanName] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formIntervalType, setFormIntervalType] = useState('MONTHLY')
  const [formProvider, setFormProvider] = useState('MANUAL')
  const [formTrialDays, setFormTrialDays] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSubscriptions()
    fetchFormData()
  }, [])

  async function fetchSubscriptions() {
    try {
      setLoading(true)
      const res = await fetch('/api/payments/subscriptions')
      const json = await res.json()
      if (json.subscriptions) setSubscriptions(json.subscriptions)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFormData() {
    try {
      const [leadsRes, catalogRes] = await Promise.all([
        fetch('/api/leads?limit=100').then((r) => r.json()),
        fetch('/api/catalog-items').then((r) => r.json()),
      ])
      if (leadsRes.leads) setLeads(leadsRes.leads)
      if (catalogRes.items) setCatalogItems(catalogRes.items)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleCreateSubscription(e: React.FormEvent) {
    e.preventDefault()
    if (!formLeadId || !formPlanName || !formAmount) return

    try {
      setSubmitting(true)
      const res = await fetch('/api/payments/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: formLeadId,
          planName: formPlanName,
          amount: parseFloat(formAmount),
          intervalType: formIntervalType,
          provider: formProvider,
          trialDays: formTrialDays ? parseInt(formTrialDays) : undefined,
        }),
      })
      const json = await res.json()
      if (json.subscription) {
        setOpenModal(false)
        fetchSubscriptions()
        setFormPlanName('')
        setFormAmount('')
        setFormTrialDays('')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelSubscription(id: string) {
    if (!confirm('Deseja realmente cancelar esta assinatura?')) return
    try {
      await fetch(`/api/payments/subscriptions/${id}`, { method: 'DELETE' })
      fetchSubscriptions()
    } catch (e) {
      console.error(e)
    }
  }

  const filteredSubs = subscriptions.filter((s) => {
    const matchesSearch =
      s.planName.toLowerCase().includes(search.toLowerCase()) ||
      s.lead?.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-4">
      {/* Controles topo */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plano ou lead..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos Status</SelectItem>
              <SelectItem value="ACTIVE">Ativa</SelectItem>
              <SelectItem value="PAST_DUE">Atrasada</SelectItem>
              <SelectItem value="CANCELLED">Cancelada</SelectItem>
              <SelectItem value="TRIALING">Teste Grátis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Assinatura
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Criar Assinatura Recorrente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubscription} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead / Assinante</label>
                <Select value={formLeadId} onValueChange={setFormLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o lead" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Plano</label>
                <Input
                  placeholder="Ex: Mentoria Recorrente Mensal"
                  value={formPlanName}
                  onChange={(e) => setFormPlanName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor por Ciclo (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Periodicidade</label>
                  <Select value={formIntervalType} onValueChange={setFormIntervalType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gateway</label>
                  <Select value={formProvider} onValueChange={setFormProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                      <SelectItem value="STRIPE">Stripe</SelectItem>
                      <SelectItem value="MERCADO_PAGO">Mercado Pago</SelectItem>
                      <SelectItem value="ASAAS">Asaas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dias de Teste (Trial)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={formTrialDays}
                    onChange={(e) => setFormTrialDays(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Criando...' : 'Criar Assinatura'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de Assinaturas */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor / Ciclo</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arrecadado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    Carregando assinaturas...
                  </TableCell>
                </TableRow>
              ) : filteredSubs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    Nenhuma assinatura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubs.map((s) => {
                  const statusMeta = SUBSCRIPTION_STATUS_META[s.status] || { label: s.status, bg: '', text: '' }
                  const intervalMeta = INTERVAL_TYPE_META[s.intervalType] || { label: s.intervalType }

                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.lead?.name || 'Lead não informado'}
                        <div className="text-xs text-muted-foreground">{s.lead?.phone}</div>
                      </TableCell>
                      <TableCell>{s.planName}</TableCell>
                      <TableCell className="font-bold">
                        {s.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {intervalMeta.label}
                      </TableCell>
                      <TableCell className="text-xs">{s.provider}</TableCell>
                      <TableCell>
                        <Badge className={`${statusMeta.bg} ${statusMeta.text} border-none`}>
                          {statusMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.totalCollected.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({s.paymentCount} cobr.)
                      </TableCell>
                      <TableCell className="text-right">
                        {s.status !== 'CANCELLED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cancelar Assinatura"
                            onClick={() => handleCancelSubscription(s.id)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
