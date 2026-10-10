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
import { PAYMENT_STATUS_META, PAYMENT_PROVIDER_META, PAYMENT_METHOD_META } from '@/lib/crm-constants'
import { Search, Plus, ExternalLink, QrCode, Copy, MessageSquare, Check, X, Share2 } from 'lucide-react'

export function PaymentOrdersList({ onSelectOrder }: { onSelectOrder?: (order: any) => void }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [providerFilter, setProviderFilter] = useState('ALL')

  // Modal nova cobrança
  const [openModal, setOpenModal] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [catalogItems, setCatalogItems] = useState<any[]>([])
  const [gateways, setGateways] = useState<any[]>([])

  const [formLeadId, setFormLeadId] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState('PIX')
  const [formProvider, setFormProvider] = useState('MANUAL')
  const [formCatalogItemId, setFormCatalogItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modal compartilhamento
  const [shareOrder, setShareOrder] = useState<any>(null)
  const [shareData, setShareData] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchOrders()
    fetchFormData()
  }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      const res = await fetch('/api/payments/orders')
      const json = await res.json()
      if (json.orders) setOrders(json.orders)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFormData() {
    try {
      const [leadsRes, catalogRes, gatewaysRes] = await Promise.all([
        fetch('/api/leads?limit=100').then((r) => r.json()),
        fetch('/api/catalog-items').then((r) => r.json()),
        fetch('/api/payments/gateways').then((r) => r.json()),
      ])
      if (leadsRes.leads) setLeads(leadsRes.leads)
      if (catalogRes.items) setCatalogItems(catalogRes.items)
      if (gatewaysRes.configs) setGateways(gatewaysRes.configs)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!formLeadId || !formDescription || !formAmount) return

    try {
      setSubmitting(true)
      const res = await fetch('/api/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: formLeadId,
          description: formDescription,
          amount: parseFloat(formAmount),
          method: formMethod,
          provider: formProvider,
          catalogItemId: formCatalogItemId || undefined,
        }),
      })
      const json = await res.json()
      if (json.order) {
        setOpenModal(false)
        fetchOrders()
        // Limpar formulário
        setFormDescription('')
        setFormAmount('')
        // Se gerou QR ou link, abre compartilhamento
        handleOpenShare(json.order)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOpenShare(order: any) {
    setShareOrder(order)
    try {
      const res = await fetch(`/api/payments/orders/${order.id}/share`)
      const json = await res.json()
      setShareData(json)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.description.toLowerCase().includes(search.toLowerCase()) ||
      o.lead?.name.toLowerCase().includes(search.toLowerCase()) ||
      o.lead?.phone.includes(search)
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
    const matchesProvider = providerFilter === 'ALL' || o.provider === providerFilter
    return matchesSearch && matchesStatus && matchesProvider
  })

  return (
    <div className="space-y-4">
      {/* Controles topo */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por lead ou descrição..."
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
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="CONFIRMED">Confirmado</SelectItem>
              <SelectItem value="FAILED">Falhou</SelectItem>
              <SelectItem value="OVERDUE">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Cobrança
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Gerar Nova Cobrança</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateOrder} className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead / Cliente</label>
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
                <label className="text-sm font-medium">Produto / Serviço (opcional)</label>
                <Select
                  value={formCatalogItemId}
                  onValueChange={(val) => {
                    setFormCatalogItemId(val)
                    const item = catalogItems.find((ci) => ci.id === val)
                    if (item) {
                      if (!formDescription) setFormDescription(item.name)
                      if (item.price) setFormAmount(String(item.price))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vincular ao catálogo" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogItems.map((ci) => (
                      <SelectItem key={ci.id} value={ci.id}>
                        {ci.name} - R$ {ci.price?.toFixed(2) || '0.00'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição da Cobrança</label>
                <Input
                  placeholder="Ex: Mentoria Módulo 1"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor (R$)</label>
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
                  <label className="text-sm font-medium">Método Preferencial</label>
                  <Select value={formMethod} onValueChange={setFormMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="BOLETO">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Gateway de Processamento</label>
                <Select value={formProvider} onValueChange={setFormProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual (Registrar Direto)</SelectItem>
                    <SelectItem value="STRIPE">Stripe</SelectItem>
                    <SelectItem value="MERCADO_PAGO">Mercado Pago</SelectItem>
                    <SelectItem value="ASAAS">Asaas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Gerando...' : 'Gerar e Processar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de Cobranças */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    Carregando cobranças...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    Nenhuma cobrança encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((o) => {
                  const statusMeta = PAYMENT_STATUS_META[o.status] || { label: o.status, bg: '', text: '' }
                  const providerMeta = PAYMENT_PROVIDER_META[o.provider] || { label: o.provider }

                  return (
                    <TableRow key={o.id} className="cursor-pointer" onClick={() => onSelectOrder?.(o)}>
                      <TableCell className="font-medium">
                        {o.lead?.name || 'Lead não informado'}
                        <div className="text-xs text-muted-foreground">{o.lead?.phone}</div>
                      </TableCell>
                      <TableCell>{o.description}</TableCell>
                      <TableCell className="font-bold">
                        {o.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {o.method || 'Geral'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{providerMeta.label}</TableCell>
                      <TableCell>
                        <Badge className={`${statusMeta.bg} ${statusMeta.text} border-none`}>
                          {statusMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" title="Compartilhar" onClick={() => handleOpenShare(o)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Compartilhamento */}
      {shareOrder && (
        <Dialog open={!!shareOrder} onOpenChange={() => setShareOrder(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Compartilhar Cobrança</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <div className="font-bold">{shareOrder.description}</div>
                <div>Valor: R$ {shareOrder.amount.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Cliente: {shareOrder.lead?.name}</div>
              </div>

              {shareData?.pixCopyPaste && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">PIX Copia e Cola</label>
                  <div className="flex gap-2">
                    <Input readOnly value={shareData.pixCopyPaste} className="text-xs font-mono" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(shareData.pixCopyPaste)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {shareData?.checkoutUrl && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Link de Checkout</label>
                  <div className="flex gap-2">
                    <Input readOnly value={shareData.checkoutUrl} className="text-xs" />
                    <Button size="icon" variant="outline" onClick={() => window.open(shareData.checkoutUrl, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {shareData?.whatsappMessage && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Mensagem para WhatsApp</label>
                  <textarea
                    readOnly
                    rows={4}
                    value={shareData.whatsappMessage}
                    className="w-full text-xs p-2 rounded-md border bg-muted/50 font-mono"
                  />
                  <Button
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      const text = encodeURIComponent(shareData.whatsappMessage)
                      const phone = shareOrder.lead?.phone?.replace(/\D/g, '') || ''
                      window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Enviar pelo WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
