'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LeadStatusBadge } from '@/components/status-badge'
import { Icon } from '@/components/layout/icon'
import { LEAD_STATUS_META, LEAD_SOURCE_META, INTERACTION_META } from '@/lib/crm-constants'
import { formatCurrency, formatDate, formatDateTime, initials } from '@/lib/format'
import { FadeIn } from '@/components/ui/animate'
import { toast } from 'sonner'
import { ArrowLeft, Mail, Phone, Building2, Hash, Star, CreditCard, FileText, Plus, AtSign, Tag, Target, Package, MessageCircle, Pencil, Loader2 } from 'lucide-react'

export interface TimelineItem {
  id: string
  type: string
  title: string
  content: string | null
  amount: number | null
  userName: string | null
  createdAt: string
}

export interface LeadDetailData {
  id: string
  name: string
  email: string | null
  phone: string
  companyName: string | null
  cnpj: string | null
  status: string
  source: string
  score: number
  tags: string[]
  dealValue: number | null
  assignedToName: string | null
  assignedToAvatar: string | null
  assignedToId: string | null
  createdAt: string
  lastInteraction: string | null
  socialMedia: string | null
  objective: string | null
  leadTypeLabels: string[]
  leadTypeColors: string[]
  leadTypeIcons: string[]
  leadTypeIds: string[]
  catalogItemName: string | null
  totalPurchased: number
  purchases: { id: string; description: string; amount: number; createdAt: string; catalogItemName: string | null }[]
  timeline: TimelineItem[]
  leadTypeOptions: { id: string; label: string; color: string; icon: string }[]
  catalogOptions: { id: string; name: string }[]
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

export function LeadEditDialog({ data, trigger }: { data: LeadDetailData; trigger: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(data.name)
  const [email, setEmail] = useState(data.email ?? '')
  const [phone, setPhone] = useState(data.phone)
  const [companyName, setCompanyName] = useState(data.companyName ?? '')
  const [cnpj, setCnpj] = useState(data.cnpj ?? '')
  const [status, setStatus] = useState(data.status)
  const [source, setSource] = useState(data.source)
  const [score, setScore] = useState(String(data.score))
  const [dealValue, setDealValue] = useState(data.dealValue != null ? String(data.dealValue) : '')
  const [socialMedia, setSocialMedia] = useState(data.socialMedia ?? '')
  const [objective, setObjective] = useState(data.objective ?? '')
  const [tags, setTags] = useState((data.tags ?? []).join(', '))
  const [assignedToId, setAssignedToId] = useState(data.assignedToId ?? '')
  const [catalogItemId, setCatalogItemId] = useState(() => {
    const match = (data.catalogOptions ?? []).find((c) => c.name === data.catalogItemName)
    return match ? match.id : ''
  })
  const [leadTypeIds, setLeadTypeIds] = useState<string[]>(data.leadTypeIds ?? [])
  const [saving, setSaving] = useState(false)

  const toggleLeadType = (id: string, checked: boolean) => {
    setLeadTypeIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)))
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe o nome do lead.'); return }
    if (!phone.trim()) { toast.error('Informe o telefone do lead.'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, companyName, cnpj, status, source,
          score: Number(score) || 0,
          dealValue: dealValue === '' ? null : Number(dealValue),
          socialMedia, objective,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          assignedToId: assignedToId || null,
          catalogItemId: catalogItemId || null,
          leadTypeIds,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Lead atualizado!')
      setOpen(false)
      router.refresh()
    } catch { toast.error('Não foi possível salvar as alterações.') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar lead</DialogTitle>
          <DialogDescription>Preencha ou corrija os dados deste lead manualmente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="e-name">Nome *</Label>
              <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="e-email">Email</Label>
              <Input id="e-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="e-phone">Telefone/WhatsApp *</Label>
              <Input id="e-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="e-company">Empresa</Label>
              <Input id="e-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Razão social" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="e-cnpj">CNPJ</Label>
              <Input id="e-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="e-social">Rede social</Label>
              <Input id="e-social" value={socialMedia} onChange={(e) => setSocialMedia(e.target.value)} placeholder="@instagram ou URL" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="e-objective">Objetivo</Label>
              <Input id="e-objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Ex.: Quer conhecer o curso" className="mt-1.5" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_STATUS_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_SOURCE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="e-score">Score (0–100)</Label>
              <Input id="e-score" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="e-deal">Valor da negociação (R$)</Label>
              <Input id="e-deal" type="number" min={0} value={dealValue} onChange={(e) => setDealValue(e.target.value)} placeholder="0,00" className="mt-1.5" />
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
            <div>
              <Label>Produto de interesse</Label>
              <Select value={catalogItemId} onValueChange={setCatalogItemId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem vínculo</SelectItem>
                  {(data.catalogOptions ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Classificar como tipo (um ou mais)</Label>
            {(data.leadTypeOptions ?? []).length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">Nenhum tipo de lead disponível. Cadastre tipos em Tipos de Lead.</p>
            ) : (
              <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                {(data.leadTypeOptions ?? []).map((lt) => {
                  const checked = leadTypeIds.includes(lt.id)
                  return (
                    <label key={lt.id} className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${checked ? 'bg-muted' : 'hover:bg-muted/60'}`}>
                      <Checkbox checked={checked} onCheckedChange={(v) => toggleLeadType(lt.id, v === true)} aria-label={`Classificar como ${lt.label}`} />
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: lt.color + '1a', color: lt.color }}>
                        <Icon name={lt.icon} className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium">{lt.label}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="e-tags">Tags</Label>
            <Input id="e-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="quente, resolve hoje, orçamento" className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground">Separe as tags por vírgula.</p>
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

export function LeadDetail({ data }: { data: LeadDetailData }) {
  const [tab, setTab] = useState('dados')
  const purchases = data.purchases ?? []
  const totalPurchased = data.totalPurchased ?? 0
  const contracts = (data.timeline ?? []).filter((t) => t.type === 'CONTRACT_SENT' || t.type === 'CONTRACT_SIGNED')

  return (
    <div>
      <div className="mb-4">
        <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Leads
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
                  <LeadStatusBadge status={data.status} />
                  {(data.leadTypeLabels ?? []).map((label, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: (data.leadTypeColors[idx] ?? '#6B7280') + '1a', color: data.leadTypeColors[idx] ?? '#6B7280' }}>
                      {data.leadTypeIcons[idx] && <Icon name={data.leadTypeIcons[idx]} className="h-3 w-3" />} {label}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {LEAD_SOURCE_META[data.source]?.label ?? data.source}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Star className="h-3 w-3" /> Score {data.score}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted-foreground">Valor da negociação</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(data.dealValue)}</p>
              <div className="mt-2 flex flex-wrap gap-2 sm:justify-end">
                {data.phone && (
                  <a href={whatsappLink(data.phone, `Olá ${data.name}! Tudo bem?`)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">
                      <MessageCircle className="h-3.5 w-3.5" /> Chamar no WhatsApp
                    </Button>
                  </a>
                )}
                <LeadEditDialog data={data} trigger={
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
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Informações de contato</h3>
              <div className="divide-y">
                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={data.email} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={data.phone} />
                <InfoRow icon={<Building2 className="h-4 w-4" />} label="Empresa" value={data.companyName} />
                <InfoRow icon={<Hash className="h-4 w-4" />} label="CNPJ" value={data.cnpj} />
                <InfoRow icon={<AtSign className="h-4 w-4" />} label="Rede social" value={data.socialMedia} />
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Detalhes da oportunidade</h3>
              <div className="divide-y">
                <InfoRow icon={<Tag className="h-4 w-4" />} label="Tipos de lead" value={(data.leadTypeLabels ?? []).length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {(data.leadTypeLabels ?? []).map((label, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: (data.leadTypeColors[idx] ?? '#6B7280') + '1a', color: data.leadTypeColors[idx] ?? '#6B7280' }}>
                        {data.leadTypeIcons[idx] && <Icon name={data.leadTypeIcons[idx]} className="h-3 w-3" />} {label}
                      </span>
                    ))}
                  </span>
                ) : '—'} />
                <InfoRow icon={<Target className="h-4 w-4" />} label="Objetivo" value={data.objective} />
                <InfoRow icon={<Package className="h-4 w-4" />} label="Produto de interesse" value={data.catalogItemName} />
                <InfoRow icon={<Star className="h-4 w-4" />} label="Responsável" value={data.assignedToName} />
                <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Valor" value={formatCurrency(data.dealValue)} />
                <InfoRow icon={<Hash className="h-4 w-4" />} label="Criado em" value={formatDate(data.createdAt)} />
                <InfoRow icon={<Hash className="h-4 w-4" />} label="Última interação" value={data.lastInteraction ? formatDateTime(data.lastInteraction) : '—'} />
              </div>
              {(data.tags?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.tags.map((t) => (
                    <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t}</span>
                  ))}
                </div>
              )}
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
              <EmptyState icon={<Hash className="h-5 w-5" />} title="Sem interações" description="As interações com este lead aparecerão aqui." />
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

        <TabsContent value="pagamentos">
          <Card className="p-5">
            {(purchases?.length ?? 0) === 0 ? (
              <EmptyState icon={<CreditCard className="h-5 w-5" />} title="Nenhuma compra registrada" description="Quando o cliente fecha uma compra ou serviço, o valor é registrado aqui automaticamente (via webhook) e empilhado no total gasto." />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4">
                  <div>
                    <p className="text-xs font-medium text-emerald-700">Total gasto pelo cliente</p>
                    <p className="text-xs text-emerald-600/70">{purchases.length} compra{purchases.length > 1 ? 's' : ''} empilhada{purchases.length > 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPurchased)}</span>
                </div>
                <div className="space-y-2">
                  {purchases.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-100 p-2 text-emerald-600"><CreditCard className="h-4 w-4" /></div>
                        <div>
                          <p className="text-sm font-medium">{p.description}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}{p.catalogItemName ? ` · ${p.catalogItemName}` : ''}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-emerald-600">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contratos">
          <Card className="p-5">
            {(contracts?.length ?? 0) === 0 ? (
              <EmptyState icon={<FileText className="h-5 w-5" />} title="Nenhum contrato" description="Contratos gerados e assinados deste lead aparecerão aqui quando o módulo de Contratos estiver ativo." />
            ) : (
              <div className="space-y-2">
                {contracts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-pink-100 p-2 text-pink-600"><FileText className="h-4 w-4" /></div>
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{INTERACTION_META[c.type]?.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
