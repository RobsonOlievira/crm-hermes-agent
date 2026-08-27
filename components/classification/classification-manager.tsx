'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Icon } from '@/components/layout/icon'
import { PageHeading } from '@/components/layout/page-heading'
import { Stagger, StaggerItem } from '@/components/ui/animate'
import { MATCH_TYPE_META, LEAD_SOURCE_META } from '@/lib/crm-constants'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Wand2, Tag, Target, MessageSquare, ArrowRight } from 'lucide-react'

export interface RuleRow {
  id: string
  name: string
  keywords: string[]
  matchType: string
  source: string | null
  leadTypeId: string | null
  leadTypeLabel: string | null
  leadTypeColor: string | null
  leadTypeIcon: string | null
  catalogItemId: string | null
  catalogItemName: string | null
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
  const [leadTypeId, setLeadTypeId] = useState(initial?.leadTypeId ?? 'none')
  const [catalogItemId, setCatalogItemId] = useState(initial?.catalogItemId ?? 'none')
  const [autoReply, setAutoReply] = useState(initial?.autoReply ?? '')
  const [priority, setPriority] = useState(initial?.priority != null ? String(initial.priority) : '0')
  const [saving, setSaving] = useState(false)

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
          leadTypeId: leadTypeId === 'none' ? null : leadTypeId,
          catalogItemId: catalogItemId === 'none' ? null : catalogItemId,
          autoReply, priority: Number(priority) || 0,
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Classificar como tipo</Label>
              <Select value={leadTypeId} onValueChange={setLeadTypeId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {leadTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vincular produto/serviço</Label>
              <Select value={catalogItemId} onValueChange={setCatalogItemId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {catalogItems.map((ci) => (
                    <SelectItem key={ci.id} value={ci.id}>{ci.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {r.leadTypeLabel && (
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Classifica como:</span>
                      <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium" style={{ backgroundColor: (r.leadTypeColor ?? '#6B7280') + '1a', color: r.leadTypeColor ?? '#6B7280' }}>
                        {r.leadTypeIcon && <Icon name={r.leadTypeIcon} className="h-3 w-3" />} {r.leadTypeLabel}
                      </span>
                    </div>
                  )}
                  {r.catalogItemName && (
                    <div className="flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Vincula:</span>
                      <span className="font-medium">{r.catalogItemName}</span>
                    </div>
                  )}
                  {r.autoReply && (
                    <div className="flex items-start gap-1.5">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="italic text-muted-foreground">“{r.autoReply}”</span>
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
