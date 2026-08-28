'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LeadStatusBadge } from '@/components/status-badge'
import { Icon } from '@/components/layout/icon'
import { LEAD_SOURCE_META, INTERACTION_META } from '@/lib/crm-constants'
import { formatCurrency, formatDate, formatDateTime, initials } from '@/lib/format'
import { FadeIn } from '@/components/ui/animate'
import { ArrowLeft, Mail, Phone, Building2, Hash, Star, CreditCard, FileText, Plus, AtSign, Tag, Target, Package } from 'lucide-react'

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
  createdAt: string
  lastInteraction: string | null
  socialMedia: string | null
  objective: string | null
  leadTypeLabels: string[]
  leadTypeColors: string[]
  leadTypeIcons: string[]
  catalogItemName: string | null
  totalPurchased: number
  purchases: { id: string; description: string; amount: number; createdAt: string; catalogItemName: string | null }[]
  timeline: TimelineItem[]
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
              <div className="mt-2 flex gap-2 sm:justify-end">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Ligar
                </Button>
                <Button size="sm" className="gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Contatar
                </Button>
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
