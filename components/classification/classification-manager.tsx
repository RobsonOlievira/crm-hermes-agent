'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from '@/components/ui/drawer'
import { Icon } from '@/components/layout/icon'
import { PageHeading } from '@/components/layout/page-heading'
import { Stagger, StaggerItem } from '@/components/ui/animate'
import { MATCH_TYPE_META, LEAD_SOURCE_META } from '@/lib/crm-constants'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Wand2, Tag, Target, MessageSquare, ChevronDown, ArrowRight } from 'lucide-react'

export interface RuleRow {
  id: string
  name: string
  keywords: string[]
  matchType: string
  source: string | null
  leadTypeIds: string[]
  leadTypeLabels: (string | null)[]
  leadTypeColors: (string | null)[]
  leadTypeIcons: (string | null)[]
  catalogItemIds: string[]
  catalogItemNames: (string | null)[]
  autoMessages: string[]
  autoReply: string | null
  isActive: boolean
  priority: number
}

export interface LeadTypeOption { id: string; label: string; color: string; icon: string }
export interface CatalogOption { id: string; name: string }

function RuleForm({
  initial, leadTypes, catalogItems, onSaved, trigger, title,
}: {
  initial?: Partial<RuleRow>
  leadTypes: LeadTypeOption[]
  catalogItems: CatalogOption[]
  onSaved: () => void
  trigger: React.ReactNode
  title: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initial?.name ?? '')
  const [keywords, setKeywords] = useState((initial?.keywords ?? []).join(', '))
  const [matchType, setMatchType] = useState(initial?.matchType ?? 'any')
  const [source, setSource] = useState(initial?.source ?? 'any')
  const [leadTypeIds, setLeadTypeIds] = useState<string[]>(initial?.leadTypeIds ?? [])
  const [catalogItemIds, setCatalogItemIds] = useState<string[]>(initial?.catalogItemIds ?? [])
  const [autoMessages, setAutoMessages] = useState<string[]>((initial?.autoMessages ?? []).length ? (initial?.autoMessages ?? []) : [''])
  const [autoReply, setAutoReply] = useState(initial?.autoReply ?? '')
  const [priority, setPriority] = useState(initial?.priority != null ? String(initial.priority) : '0')
  const [saving, setSaving] = useState(false)

  const updateAutoMessage = (idx: number, value: string) => {
    setAutoMessages((prev) => prev.map((m, i) => (i === idx ? value : m)))
  }

  const removeAutoMessage = (idx: number) => {
    setAutoMessages((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']))
  }

  const addAutoMessage = () => setAutoMessages((prev) => [...prev, ''])

  const toggleLeadType = (id: string, checked: boolean) => {
    setLeadTypeIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)))
  }

  const toggleCatalogItem = (id: string, checked: boolean) => {
    setCatalogItemIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)))
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe um nome para a regra.'); return }
    if (!keywords.trim()) { toast.error('Informe ao menos uma palavra-chave.'); return }
    setSaving(true)
    try {
      const isEdit = Boolean(initial?.id)
      const res = await fetch(isEdit ? `/api/classification-rules/${initial!.id}` : '/api/classification-rules', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, keywords, matchType,
          source: source === 'any' ? null : source,
          leadTypeIds,
          catalogItemIds,
          autoMessages: autoMessages.map((m) => m.trim()).filter(Boolean), autoReply, priority: Number(priority) || 0,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(isEdit ? 'Regra atualizada!' : 'Regra criada!')
      setOpen(false)
      onSaved()
    } catch { toast.error('Não foi possível salvar a regra.') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Quando uma mensagem contém as palavras-chave, o lead é classificado automaticamente no tipo e vinculado ao produto/objetivo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="r-name">Nome da regra</Label>
            <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Interesse em curso" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="r-keywords">Palavras-chave</Label>
            <Textarea id="r-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="curso, aula, matrícula, inscrição" className="mt-1.5" rows={2} />
            <p className="mt-1 text-xs text-muted-foreground">Separe as palavras por vírgula.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Correspondência</Label>
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MATCH_TYPE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Origem (opcional)</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer origem</SelectItem>
                  {Object.entries(LEAD_SOURCE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Classificar como tipo (um ou mais)</Label>
            <p className="mt-1 text-xs text-muted-foreground">Quando a regra bater, esses tipos são somados aos que o lead já tem.</p>
            <Drawer>
              <DrawerTrigger asChild>
                <Button type="button" variant="outline" className="mt-1.5 h-auto w-full flex-wrap justify-between gap-2 px-3 py-2">
                  {leadTypeIds.length === 0 ? (
                    <span className="py-0.5 text-sm font-normal text-muted-foreground">Selecione os tipos…</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1.5">
                      {leadTypes
                        .filter((lt) => leadTypeIds.includes(lt.id))
                        .map((lt) => (
                          <span key={lt.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: lt.color + '1a', color: lt.color }}>
                            <Icon name={lt.icon} className="h-3 w-3" /> {lt.label}
                          </span>
                        ))}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Classificar como tipo</DrawerTitle>
                  <DrawerDescription>Selecione um ou mais tipos de lead que esta regra irá atribuir.</DrawerDescription>
                </DrawerHeader>
                <div className="space-y-2 px-4 pb-2">
                  {leadTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum tipo de lead disponível. Cadastre tipos em Tipos de Lead.</p>
                  ) : (
                    leadTypes.map((lt) => {
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
                    })
                  )}
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button>Concluir ({leadTypeIds.length} selecionado{leadTypeIds.length === 1 ? '' : 's'})</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
          <div>
            <Label>Vincular produto/serviço (um ou mais)</Label>
            <p className="mt-1 text-xs text-muted-foreground">Um lead pode querer outros produtos além do básico. Quando a regra bater, todos os produtos selecionados são vinculados ao lead.</p>
            <Drawer>
              <DrawerTrigger asChild>
                <Button type="button" variant="outline" className="mt-1.5 h-auto w-full flex-wrap justify-between gap-2 px-3 py-2">
                  {catalogItemIds.length === 0 ? (
                    <span className="py-0.5 text-sm font-normal text-muted-foreground">Selecione os produtos…</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1.5">
                      {catalogItems
                        .filter((ci) => catalogItemIds.includes(ci.id))
                        .map((ci) => (
                          <span key={ci.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                            <Target className="h-3 w-3" /> {ci.name}
                          </span>
                        ))}
                    </span>
                  )}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Vincular produto/serviço</DrawerTitle>
                  <DrawerDescription>Selecione um ou mais produtos que esta regra irá vincular ao lead.</DrawerDescription>
                </DrawerHeader>
                <div className="max-h-[50vh] space-y-2 overflow-y-auto px-4 pb-2">
                  {catalogItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum produto/serviço no catálogo. Adicione itens em Catálogo de Produtos.</p>
                  ) : (
                    catalogItems.map((ci) => {
                      const checked = catalogItemIds.includes(ci.id)
                      return (
                        <label key={ci.id} className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${checked ? 'bg-muted' : 'hover:bg-muted/60'}`}>
                          <Checkbox checked={checked} onCheckedChange={(v) => toggleCatalogItem(ci.id, v === true)} aria-label={`Vincular ${ci.name}`} />
                          <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{ci.name}</span>
                        </label>
                      )
                    })
                  )}
                </div>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button>Concluir ({catalogItemIds.length} selecionado{catalogItemIds.length === 1 ? '' : 's'})</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
          <div>
            <Label>Mensagens automáticas (uma ou mais)</Label>
            <p className="mt-1 text-xs text-muted-foreground">Cada mensagem pré-preenche o WhatsApp ao clicar no botão do lead. Você pode ter quantas quiser para a mesma classificação.</p>
            <div className="mt-1.5 space-y-2">
              {autoMessages.map((msg, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Textarea
                    value={msg}
                    onChange={(e) => updateAutoMessage(idx, e.target.value)}
                    placeholder={`Mensagem ${idx + 1}…`}
                    className="min-h-[44px] flex-1 resize-none"
                    rows={2}
                  />
                  <Button type="button" variant="ghost" size="icon" className="mt-0.5 h-9 w-9 shrink-0 text-muted-foreground hover:text-red-600" onClick={() => removeAutoMessage(idx)} aria-label={`Remover mensagem ${idx + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={addAutoMessage}>
                <Plus className="h-3.5 w-3.5" /> Adicionar mensagem
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="r-reply">Resposta automática (opcional)</Label>
            <Textarea id="r-reply" value={autoReply ?? ''} onChange={(e) => setAutoReply(e.target.value)} placeholder="Olá! Que bom seu interesse no curso. Vou te enviar todos os detalhes 😊" className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label htmlFor="r-priority">Prioridade</Label>
            <Input id="r-priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground">Regras com maior prioridade são avaliadas primeiro.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ClassificationManager({
  initial, leadTypes, catalogItems, canManage,
}: {
  initial: RuleRow[]
  leadTypes: LeadTypeOption[]
  catalogItems: CatalogOption[]
  canManage: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const refresh = () => router.refresh()

  const toggleActive = async (r: RuleRow) => {
    setBusy(r.id)
    try {
      await fetch(`/api/classification-rules/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !r.isActive }) })
      refresh()
    } catch { toast.error('Erro ao atualizar.') } finally { setBusy(null) }
  }

  const remove = async (r: RuleRow) => {
    setBusy(r.id)
    try {
      const res = await fetch(`/api/classification-rules/${r.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Regra excluída.')
      refresh()
    } catch { toast.error('Erro ao excluir.') } finally { setBusy(null) }
  }

  return (
    <div>
      <PageHeading
        title="Classificação Automática"
        description="Cadastre regras que leem as mensagens recebidas (WhatsApp, campanhas, tráfego pago) e classificam o lead pelo tipo, vinculando produto e objetivo automaticamente."
        actions={canManage ? (
          <RuleForm title="Nova regra de classificação" leadTypes={leadTypes} catalogItems={catalogItems} onSaved={refresh} trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> Nova regra</Button>} />
        ) : null}
      />

      {initial.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Wand2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Nenhuma regra cadastrada</p>
          <p className="max-w-sm text-sm text-muted-foreground">Crie regras para que o CRM identifique automaticamente o tipo de cada lead pelas palavras das mensagens.</p>
        </Card>
      ) : (
        <Stagger className="grid gap-3 lg:grid-cols-2">
          {initial.map((r) => (
            <StaggerItem key={r.id}>
              <Card className={`flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md ${r.isActive ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wand2 className="h-4 w-4" /></span>
                    <div>
                      <p className="font-semibold leading-tight">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{MATCH_TYPE_META[r.matchType]?.label ?? r.matchType}{r.source ? ` · ${LEAD_SOURCE_META[r.source]?.label ?? r.source}` : ''}</p>
                    </div>
                  </div>
                  {canManage && <Switch checked={r.isActive} disabled={busy === r.id} onCheckedChange={() => toggleActive(r)} aria-label={`Ativar ${r.name}`} />}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {r.keywords.map((kw) => (
                    <span key={kw} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{kw}</span>
                  ))}
                </div>

                <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5 text-xs">
                  {r.leadTypeIds?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Classifica como:</span>
                      {(r.leadTypeIds ?? []).map((id, idx) => {
                        const color = r.leadTypeColors?.[idx] ?? '#6B7280'
                        const icon = r.leadTypeIcons?.[idx]
                        const label = r.leadTypeLabels?.[idx]
                        return (
                          <span key={id} title={label ?? id} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium" style={{ backgroundColor: color + '1a', color }}>
                            {icon && <Icon name={icon} className="h-3 w-3" />} {label ?? id}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {r.catalogItemNames?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Vincula:</span>
                      {(r.catalogItemIds ?? []).map((id, idx) => (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
                          {r.catalogItemNames?.[idx] ?? id}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.autoMessages?.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-start gap-1.5">
                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">Mensagens automáticas ({r.autoMessages.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {r.autoMessages.map((msg, idx) => (
                          <span key={idx} className="rounded-full bg-muted px-2.5 py-1 italic text-muted-foreground">“{msg}”</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {r.autoReply && (
                    <div className="flex items-start gap-1.5">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div>
                        <span className="text-muted-foreground">Resposta automática: </span>
                        <span className="italic">“{r.autoReply}”</span>
                      </div>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="mt-auto flex items-center justify-end gap-1 border-t pt-3">
                    <RuleForm title="Editar regra" initial={r} leadTypes={leadTypes} catalogItems={catalogItems} onSaved={refresh} trigger={<Button variant="ghost" size="icon-sm"><Pencil className="h-3.5 w-3.5" /></Button>} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir “{r.name}”?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(r)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  )
}
