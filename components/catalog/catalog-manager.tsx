'use client'

import { useState, useMemo } from 'react'
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
import { CATALOG_KIND_META } from '@/lib/crm-constants'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Target, Package, Wrench, Tag } from 'lucide-react'

export interface CatalogRow {
  id: string
  name: string
  kind: string
  description: string | null
  price: number | null
  objective: string | null
  leadTypeId: string | null
  leadTypeLabel: string | null
  leadTypeColor: string | null
  leadTypeIcon: string | null
  isActive: boolean
  leadCount: number
}

export interface LeadTypeOption { id: string; label: string; color: string; icon: string }

function ItemForm({
  initial, leadTypes, onSaved, trigger, title,
}: {
  initial?: Partial<CatalogRow>
  leadTypes: LeadTypeOption[]
  onSaved: () => void
  trigger: React.ReactNode
  title: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState(initial?.kind ?? 'PRODUTO')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '')
  const [objective, setObjective] = useState(initial?.objective ?? '')
  const [leadTypeId, setLeadTypeId] = useState(initial?.leadTypeId ?? 'none')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Informe o nome do item.'); return }
    setSaving(true)
    try {
      const isEdit = Boolean(initial?.id)
      const res = await fetch(isEdit ? `/api/catalog/${initial!.id}` : '/api/catalog', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind, description, price, objective, leadTypeId: leadTypeId === 'none' ? null : leadTypeId }),
      })
      if (!res.ok) throw new Error()
      toast.success(isEdit ? 'Item atualizado!' : 'Item adicionado ao catálogo!')
      setOpen(false)
      onSaved()
    } catch { toast.error('Não foi possível salvar o item.') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Vincule o item ao tipo de lead e ao objetivo que ele atende.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="ci-name">Nome do produto/serviço</Label>
            <Input id="ci-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Curso de Marketing Digital" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUTO">Produto</SelectItem>
                  <SelectItem value="SERVICO">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ci-price">Preço (R$)</Label>
              <Input id="ci-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Opcional" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Tipo de lead alvo</Label>
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
            <Label htmlFor="ci-obj">Objetivo do lead</Label>
            <Input id="ci-obj" value={objective ?? ''} onChange={(e) => setObjective(e.target.value)} placeholder="Ex.: Comprar o curso de Marketing Digital" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="ci-desc">Descrição</Label>
            <Textarea id="ci-desc" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do item" className="mt-1.5" rows={2} />
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

export function CatalogManager({ initial, leadTypes, canManage }: { initial: CatalogRow[]; leadTypes: LeadTypeOption[]; canManage: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  const refresh = () => router.refresh()

  const items = useMemo(() => {
    if (filter === 'all') return initial
    return initial.filter((i) => i.kind === filter)
  }, [initial, filter])

  const toggleActive = async (i: CatalogRow) => {
    setBusy(i.id)
    try {
      await fetch(`/api/catalog/${i.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !i.isActive }) })
      refresh()
    } catch { toast.error('Erro ao atualizar.') } finally { setBusy(null) }
  }

  const remove = async (i: CatalogRow) => {
    setBusy(i.id)
    try {
      const res = await fetch(`/api/catalog/${i.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Item excluído.')
      refresh()
    } catch { toast.error('Erro ao excluir.') } finally { setBusy(null) }
  }

  return (
    <div>
      <PageHeading
        title="Catálogo de Produtos e Serviços"
        description="Tudo o que a sua empresa oferece. Cada item conecta um produto ou serviço ao tipo de lead que o deseja e ao objetivo dele no funil."
        actions={canManage ? (
          <ItemForm title="Novo item do catálogo" leadTypes={leadTypes} onSaved={refresh} trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> Novo item</Button>} />
        ) : null}
      />

      <div className="mb-4 flex items-center gap-2">
        {[{ k: 'all', l: 'Todos' }, { k: 'PRODUTO', l: 'Produtos' }, { k: 'SERVICO', l: 'Serviços' }].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filter === f.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>{f.l}</button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Package className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Nenhum item no catálogo</p>
          <p className="max-w-sm text-sm text-muted-foreground">Adicione seus produtos e serviços para vincular aos tipos de lead e objetivos.</p>
        </Card>
      ) : (
        <Stagger key={filter} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => {
            const kindMeta = CATALOG_KIND_META[i.kind]
            return (
              <StaggerItem key={i.id}>
                <Card className={`flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-md ${i.isActive ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${kindMeta?.bg} ${kindMeta?.text}`}>
                        {i.kind === 'SERVICO' ? <Wrench className="h-3 w-3" /> : <Package className="h-3 w-3" />} {kindMeta?.label}
                      </span>
                    </div>
                    {canManage && <Switch checked={i.isActive} disabled={busy === i.id} onCheckedChange={() => toggleActive(i)} aria-label={`Ativar ${i.name}`} />}
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{i.name}</p>
                    {i.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.description}</p>}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {i.leadTypeLabel && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium" style={{ backgroundColor: (i.leadTypeColor ?? '#6B7280') + '1a', color: i.leadTypeColor ?? '#6B7280' }}>
                          {i.leadTypeIcon && <Icon name={i.leadTypeIcon} className="h-3 w-3" />} {i.leadTypeLabel}
                        </span>
                      </div>
                    )}
                    {i.objective && (
                      <div className="flex items-start gap-1.5">
                        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">{i.objective}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t pt-3">
                    <span className="text-sm font-bold text-primary">{i.price != null ? formatCurrency(i.price) : 'Sob consulta'}</span>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <ItemForm title="Editar item" initial={i} leadTypes={leadTypes} onSaved={refresh} trigger={<Button variant="ghost" size="icon-sm"><Pencil className="h-3.5 w-3.5" /></Button>} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir “{i.name}”?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(i)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </Card>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </div>
  )
}
