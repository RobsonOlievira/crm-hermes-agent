'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Icon, ICON_CHOICES } from '@/components/layout/icon'
import { PageHeading } from '@/components/layout/page-heading'
import { Stagger, StaggerItem } from '@/components/ui/animate'
import { useViewRole } from '@/components/providers/view-role-provider'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Lock, ShieldAlert, Loader2, Users, Package } from 'lucide-react'

export interface LeadTypeRow {
  id: string
  key: string
  label: string
  color: string
  icon: string
  description: string | null
  isSystem: boolean
  isActive: boolean
  leadCount: number
  catalogCount: number
}

const COLOR_CHOICES = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899', '#EF4444', '#6366F1', '#14B8A6', '#6B7280']

function TypeForm({
  initial, onSaved, trigger, title,
}: {
  initial?: Partial<LeadTypeRow>
  onSaved: () => void
  trigger: React.ReactNode
  title: string
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState(initial?.label ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? '#3B82F6')
  const [icon, setIcon] = useState(initial?.icon ?? 'Tag')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!label.trim()) { toast.error('Informe um nome para o tipo.'); return }
    setSaving(true)
    try {
      const isEdit = Boolean(initial?.id)
      const res = await fetch(isEdit ? `/api/lead-types/${initial!.id}` : '/api/lead-types', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, description, color, icon }),
      })
      if (!res.ok) throw new Error()
      toast.success(isEdit ? 'Tipo atualizado!' : 'Tipo criado com sucesso!')
      setOpen(false)
      onSaved()
    } catch {
      toast.error('Não foi possível salvar o tipo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Configure como este tipo de lead aparece no seu CRM.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="lt-label">Nome do tipo</Label>
            <Input id="lt-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Afiliado, Investidor..." className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="lt-desc">Descrição</Label>
            <Textarea id="lt-desc" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} placeholder="Quando usar este tipo de lead" className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label>Cor</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {COLOR_CHOICES.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className="h-8 w-8 rounded-full transition-transform hover:scale-110" style={{ backgroundColor: c, boxShadow: color.toLowerCase() === c.toLowerCase() ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }} aria-label={`Cor ${c}`} />
              ))}
            </div>
          </div>
          <div>
            <Label>Ícone</Label>
            <div className="mt-1.5 grid grid-cols-8 gap-2">
              {ICON_CHOICES.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${icon === ic ? 'border-transparent text-white' : 'text-muted-foreground hover:bg-muted'}`} style={{ backgroundColor: icon === ic ? color : undefined }} aria-label={ic}>
                  <Icon name={ic} className="h-4 w-4" />
                </button>
              ))}
            </div>
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

export function LeadTypesManager({ initial }: { initial: LeadTypeRow[] }) {
  const router = useRouter()
  const { can } = useViewRole()
  const [busy, setBusy] = useState<string | null>(null)

  if (!can('settings:modules')) {
    return (
      <div>
        <PageHeading title="Tipos de Lead" description="Classifique seus leads por tipo." />
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Acesso restrito</p>
          <p className="max-w-sm text-sm text-muted-foreground">Apenas administradores podem gerenciar os tipos de lead. Altere o perfil de visualização para Administrador no menu superior.</p>
        </Card>
      </div>
    )
  }

  const refresh = () => router.refresh()

  const toggleActive = async (t: LeadTypeRow) => {
    setBusy(t.id)
    try {
      await fetch(`/api/lead-types/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !t.isActive }) })
      refresh()
    } catch { toast.error('Erro ao atualizar.') } finally { setBusy(null) }
  }

  const remove = async (t: LeadTypeRow) => {
    setBusy(t.id)
    try {
      const res = await fetch(`/api/lead-types/${t.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error)
      toast.success('Tipo excluído.')
      refresh()
    } catch (e: any) { toast.error(e?.message || 'Erro ao excluir.') } finally { setBusy(null) }
  }

  return (
    <div>
      <PageHeading
        title="Tipos de Lead"
        description="O tipo identifica o que cada lead representa para o seu negócio — aluno, cliente, parceiro e outros. Crie quantos tipos precisar."
        actions={
          <TypeForm title="Novo tipo de lead" onSaved={refresh} trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> Novo tipo</Button>} />
        }
      />
      <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {initial.map((t) => (
          <StaggerItem key={t.id}>
            <Card className={`flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md ${t.isActive ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: t.color + '1a', color: t.color }}>
                  <Icon name={t.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{t.label}</p>
                    {t.isSystem && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"><Lock className="h-2.5 w-2.5" /> Padrão</span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description ?? 'Sem descrição.'}</p>
                </div>
                <Switch checked={t.isActive} disabled={busy === t.id} onCheckedChange={() => toggleActive(t)} aria-label={`Ativar ${t.label}`} />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {t.leadCount} leads</span>
                <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {t.catalogCount} no catálogo</span>
              </div>
              <div className="mt-auto flex items-center gap-2 border-t pt-3">
                <TypeForm title="Editar tipo de lead" initial={t} onSaved={refresh} trigger={<Button variant="outline" size="sm" className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Editar</Button>} />
                {!t.isSystem && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir “{t.label}”?</AlertDialogTitle>
                        <AlertDialogDescription>Os leads e itens vinculados a este tipo ficarão sem classificação. Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(t)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}
