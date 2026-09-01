'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ClientStatusBadge } from '@/components/status-badge'
import { Icon } from '@/components/layout/icon'
import { CLIENT_STATUS_META, INTERACTION_META } from '@/lib/crm-constants'
import { formatCurrency, formatDate, formatDateTime, initials } from '@/lib/format'
import { FadeIn } from '@/components/ui/animate'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Phone, Building2, Hash, Tag, User as UserIcon, CreditCard, MessageCircle, Pencil, Loader2, Plus } from 'lucide-react'

export interface ClientTimelineItem {
  id: string
  type: string
  title: string
  content: string | null
  amount: number | null
  userName: string | null
  createdAt: string
}

export interface ClientDetailData {
  id: string
  name: string
  email: string | null
  phone: string
  companyName: string | null
  cnpj: string | null
  status: string
  segment: string | null
  lifetimeValue: number
  assignedToName: string | null
  assignedToAvatar: string | null
  assignedToId: string | null
  createdAt: string
  updatedAt: string
  timeline: ClientTimelineItem[]
  memberOptions: { id: string; name: string }[]
}

function whatsappDigits(phone: string): string {
  let d = (phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (!d.startsWith('55')) d = '55' + d
  return d
}

function whatsappLink(phone: string, text: string): string {
  const digits = whatsappDigits(phone)
  if (!digits) return ''
  const query = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${query}`
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value ?? '—'}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center">
      <div className="mb-1 rounded-full bg-muted p-3 text-muted-foreground">{icon}</div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export function ClientEditDialog({ data, trigger }: { data: ClientDetailData; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(data.name)
  const [email, setEmail] = useState(data.email ?? '')
  const [phone, setPhone] = useState(data.phone)
  const [companyName, setCompanyName] = useState(data.companyName ?? '')
  const [cnpj, setCnpj] = useState(data.cnpj ?? '')
  const [segment, setSegment] = useState(data.segment ?? '')
  const [status, setStatus] = useState(data.status)
  const [lifetimeValue, setLifetimeValue] = useState(data.lifetimeValue != null ? String(data.lifetimeValue) : '0')
  const [assignedToId, setAssignedToId] = useState(data.assignedToId ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe o nome do cliente.'); return }
    if (!phone.trim()) { toast.error('Informe o telefone/WhatsApp do cliente.'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, companyName, cnpj, segment, status,
          lifetimeValue: lifetimeValue === '' ? 0 : Number(lifetimeValue),
          assignedToId: assignedToId || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Cliente atualizado!')
      setOpen(false)
      router.refresh()
    } catch { toast.error('Não foi possível salvar as alterações.') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
          <DialogDescription>Preencha ou corrija os dados deste cliente manualmente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="c-name">Nome *</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="c-phone">Telefone/WhatsApp *</Label>
              <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="c-company">Empresa</Label>
              <Input id="c-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Razão social" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="c-cnpj">CNPJ</Label>
              <Input id="c-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="c-segment">Segmento</Label>
              <Input id="c-segment" value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex.: Gestor de Tráfego | Curitiba - PR" className="mt-1.5" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_STATUS_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="c-ltv">Valor lifetime (R$)</Label>
              <Input id="c-ltv" type="number" min={0} value={lifetimeValue} onChange={(e) => setLifetimeValue(e.target.value)} placeholder="0,00" className="mt-1.5" />
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem responsável</SelectItem>
                  {(data.memberOptions ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ClientDetail({ data }: { data: ClientDetailData }) {
  const [tab, setTab] = useState('dados')

  return (
    <div>
      <div className="mb-4">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Clientes
        </Link>
      </div>

      <FadeIn>
        <Card className="mb-6 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                {data.assignedToAvatar && <AvatarImage src={data.assignedToAvatar} alt={data.name} />}
                <AvatarFallback className="bg-primary/10 text-primary">{initials(data.name)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-display text-xl font-bold sm:text-2xl">{data.name}</h1>
                {data.companyName && <p className="text-sm text-muted-foreground">{data.companyName}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ClientStatusBadge status={data.status} />
                  {data.segment && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      <Tag className="h-3 w-3" /> {data.segment}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted-foreground">Valor lifetime</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(data.lifetimeValue)}</p>
              <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                {data.phone && (
                  <a href={whatsappLink(data.phone, `Olá ${data.name}! Tudo bem?`)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">
                      <MessageCircle className="h-3.5 w-3.5" /> Chamar no WhatsApp
                    </Button>
                  </a>
                )}
                <ClientEditDialog data={data} trigger={
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                } />
              </div>
            </div>
          </div>
        </Card>
      </FadeIn>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="interacoes">Interações</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Informações de contato</h3>
              <div className="divide-y">
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={data.email} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone/WhatsApp" value={data.phone} />
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Empresa" value={data.companyName} />
                <InfoRow icon={<Hash className="h-4 w-4" />} label="CNPJ" value={data.cnpj} />
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Detalhes do relacionamento</h3>
              <div className="divide-y">
                <InfoRow icon={<Tag className="h-4 w-4" />} label="Segmento" value={data.segment} />
                <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Responsável" value={data.assignedToName} />
                <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Valor lifetime" value={formatCurrency(data.lifetimeValue)} />
                <InfoRow icon={<Hash className="h-4 w-4" />} label="Criado em" value={formatDate(data.createdAt)} />
                <InfoRow icon={<Hash className="h-4 w-4" />} label="Atualizado em" value={formatDateTime(data.updatedAt)} />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interacoes">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Linha do tempo</h3>
              <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Nova interação</Button>
            </div>
            {(data.timeline?.length ?? 0) === 0 ? (
              <EmptyState icon={<Hash className="h-5 w-5" />} title="Sem interações" description="As interações com este cliente aparecerão aqui." />
            ) : (
              <div className="relative space-y-1 pl-2">
                {(data.timeline ?? []).map((item, idx) => {
                  const meta = INTERACTION_META[item.type]
                  const isLast = idx === (data.timeline?.length ?? 0) - 1
                  return (
                    <div key={item.id} className="relative flex gap-3 pb-5">
                      {!isLast && <span className="absolute left-[15px] top-8 h-full w-px bg-border" />}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: (meta?.color ?? '#6B7280') + '1a', color: meta?.color ?? '#6B7280' }}
                      >
                        <Icon name={meta?.icon ?? 'Activity'} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                        </div>
                        {item.content && <p className="mt-0.5 text-sm text-muted-foreground">{item.content}</p>}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{meta?.label ?? item.type}</span>
                          {item.userName && <span className="text-xs text-muted-foreground">· {item.userName}</span>}
                          {item.amount != null && (
                            <span className="text-xs font-semibold text-emerald-600">{formatCurrency(item.amount)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}