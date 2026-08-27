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
import { JOURNEY_STAGES, TRIGGER_TYPE_META, AUTOMATION_ACTION_META, LEAD_STATUS_META } from '@/lib/crm-constants'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Workflow, ArrowRight, Clock, Bot, MessageCircle, Tag as TagIcon } from 'lucide-react'

export interface AutomationRow {
  id: string
  name: string
  description: string | null
  fromStatus: string | null
  toStatus: string | null
  triggerType: string
  delayHours: number
  action: string
  message: string | null
  keepChannelTag: boolean
  connectHermes: boolean
  isActive: boolean
  sortOrder: number
}

function statusLabel(s: string | null) {
  if (!s) return 'Qualquer etapa'
  return LEAD_STATUS_META[s]?.label ?? s
}
function statusColor(s: string | null) {
  if (!s) return '#6B7280'
  return LEAD_STATUS_META[s]?.color ?? '#6B7280'
}
function delayLabel(h: number) {
  if (!h) return 'Imediato'
  if (h % 24 === 0) return `${h / 24} dia${h / 24 > 1 ? 's' : ''}`
  return `${h}h`
}

function AutomationForm({
  initial, onSaved, trigger, title,
}: {
  initial?: Partial<AutomationRow>
  onSaved: () => void
  trigger: React.ReactNode
  title: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [fromStatus, setFromStatus] = useState(initial?.fromStatus ?? 'any')
  const [toStatus, setToStatus] = useState(initial?.toStatus ?? 'any')
  const [triggerType, setTriggerType] = useState(initial?.triggerType ?? 'no_reply')
  const [delayHours, setDelayHours] = useState(initial?.delayHours != null ? String(initial.delayHours) : '0')
  const [action, setAction] = useState(initial?.action ?? 'move_stage')
  const [message, setMessage] = useState(initial?.message ?? '')
  const [keepChannelTag, setKeepChannelTag] = useState(initial?.keepChannelTag ?? true)
  const [connectHermes, setConnectHermes] = useState(initial?.connectHermes ?? true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe um nome para a automação.'); return }
    setSaving(true)
    try {
      const isEdit = Boolean(initial?.id)
      const res = await fetch(isEdit ? `/api/journey-automations/${initial!.id}` : '/api/journey-automations', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description,
          fromStatus: fromStatus === 'any' ? null : fromStatus,
          toStatus: toStatus === 'any' ? null : toStatus,
          triggerType, delayHours: Number(delayHours) || 0, action, message,
          keepChannelTag, connectHermes,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(isEdit ? 'Automação atualizada!' : 'Automação criada!')
      setOpen(false)
      onSaved()
    } catch { toast.error('Não foi possível salvar a automação.') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Defina o gatilho, o tempo de espera e a ação que move o cliente pela jornada de compra. Automações com o Hermes acionam o agente 24/7 para reengajar o lead.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="a-name">Nome da automação</Label>
            <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Conversa Ativa → Follow-up" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="a-desc">Descrição</Label>
            <Textarea id="a-desc" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} placeholder="O que essa automação faz na jornada" className="mt-1.5" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Etapa de origem</Label>
              <Select value={fromStatus} onValueChange={setFromStatus}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer etapa</SelectItem>
                  {JOURNEY_STAGES.map((s) => (
                    <SelectItem key={s.status} value={s.status}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Etapa de destino</Label>
              <Select value={toStatus} onValueChange={setToStatus}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer etapa</SelectItem>
                  {JOURNEY_STAGES.map((s) => (
                    <SelectItem key={s.status} value={s.status}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gatilho</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_TYPE_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="a-delay">Espera (horas)</Label>
              <Input id="a-delay" type="number" min={0} value={delayHours} onChange={(e) => setDelayHours(e.target.value)} className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">Ex.: 48 = 2 dias, 168 = 7 dias.</p>
            </div>
          </div>
          <div>
            <Label>Ação</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(AUTOMATION_ACTION_META).map(([k, m]) => (
                  <SelectItem key={k} value={k}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="a-msg">Mensagem / prompt (opcional)</Label>
            <Textarea id="a-msg" value={message ?? ''} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem que o Hermes usa ao reativar o lead" className="mt-1.5" rows={2} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Manter tag do canal de origem</p>
              <p className="text-xs text-muted-foreground">Preserva de onde o lead veio (WhatsApp, Ads...).</p>
            </div>
            <Switch checked={keepChannelTag} onCheckedChange={setKeepChannelTag} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <div>
              <p className="text-sm font-medium">Conectar ao Hermes Agent</p>
              <p className="text-xs text-muted-foreground">O agente 24/7 executa esta automação.</p>
            </div>
            <Switch checked={connectHermes} onCheckedChange={setConnectHermes} />
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

export function JourneyAutomationsManager({ initial, canManage }: { initial: AutomationRow[]; canManage: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const refresh = () => router.refresh()

  const toggleActive = async (a: AutomationRow) => {
    setBusy(a.id)
    try {
      await fetch(`/api/journey-automations/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !a.isActive }) })
      refresh()
    } catch { toast.error('Erro ao atualizar.') } finally { setBusy(null) }
  }

  const remove = async (a: AutomationRow) => {
    setBusy(a.id)
    try {
      const res = await fetch(`/api/journey-automations/${a.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Automação excluída.')
      refresh()
    } catch { toast.error('Erro ao excluir.') } finally { setBusy(null) }
  }

  return (
    <div>
      <PageHeading
        title="Automações da Jornada"
        description="Configure os fluxos que movem o cliente pela jornada de compra — do primeiro contato ao serviço fechado. As automações conversam com o Hermes Agent, que reativa leads parados com perguntas, atualizações e ofertas."
        actions={canManage ? (
          <AutomationForm title="Nova automação" onSaved={refresh} trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> Nova automação</Button>} />
        ) : null}
      />

      <Card className="mb-5 flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Bot className="h-5 w-5" /></span>
        <div className="text-sm">
          <p className="font-semibold">Integração com o Hermes Agent</p>
          <p className="text-muted-foreground">Cada fluxo abaixo pode acionar o Hermes — seu agente 24/7 — para puxar o histórico da conversa, avaliar a melhor tentativa de contato e reengajar o lead automaticamente. Novos contatos entram em Primeiro Contato; sem resposta, avançam para Follow-up, Banco de 7 dias e follow-up agressivo; ao fechar, vão para Serviço Fechado com o valor empilhado.</p>
        </div>
      </Card>

      {initial.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Workflow className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Nenhuma automação cadastrada</p>
          <p className="max-w-sm text-sm text-muted-foreground">Crie fluxos para mover os leads automaticamente pela jornada de compra.</p>
        </Card>
      ) : (
        <Stagger className="grid gap-3 lg:grid-cols-2">
          {initial.map((a) => {
            const actionMeta = AUTOMATION_ACTION_META[a.action]
            const triggerMeta = TRIGGER_TYPE_META[a.triggerType]
            return (
              <StaggerItem key={a.id}>
                <Card className={`flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md ${a.isActive ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {actionMeta?.icon ? <Icon name={actionMeta.icon} className="h-4 w-4" /> : <Workflow className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{triggerMeta?.label ?? a.triggerType} · {actionMeta?.label ?? a.action}</p>
                      </div>
                    </div>
                    {canManage && <Switch checked={a.isActive} disabled={busy === a.id} onCheckedChange={() => toggleActive(a)} aria-label={`Ativar ${a.name}`} />}
                  </div>

                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}

                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: statusColor(a.fromStatus) + '1a', color: statusColor(a.fromStatus) }}>{statusLabel(a.fromStatus)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: statusColor(a.toStatus) + '1a', color: statusColor(a.toStatus) }}>{statusLabel(a.toStatus)}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {delayLabel(a.delayHours)}</span>
                  </div>

                  {a.message && (
                    <div className="flex items-start gap-1.5 text-xs">
                      <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="italic text-muted-foreground">“{a.message}”</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {a.connectHermes && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"><Bot className="h-3 w-3" /> Hermes Agent</span>
                    )}
                    {a.keepChannelTag && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"><TagIcon className="h-3 w-3" /> Mantém tag do canal</span>
                    )}
                  </div>

                  {canManage && (
                    <div className="mt-auto flex items-center justify-end gap-1 border-t pt-3">
                      <AutomationForm title="Editar automação" initial={a} onSaved={refresh} trigger={<Button variant="ghost" size="icon-sm"><Pencil className="h-3.5 w-3.5" /></Button>} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir “{a.name}”?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(a)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </Card>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </div>
  )
}
