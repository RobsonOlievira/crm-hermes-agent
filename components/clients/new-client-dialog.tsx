'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import { CLIENT_STATUS_META } from '@/lib/crm-constants'
import { toast } from 'sonner'
import { Building2, Loader2, UserPlus } from 'lucide-react'

export function NewClientDialog({ members }: { members: { id: string; name: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [segment, setSegment] = useState('')
  const [status, setStatus] = useState('ATIVO')
  const [lifetimeValue, setLifetimeValue] = useState('0')
  const [assignedToId, setAssignedToId] = useState('_none_')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName(''); setPhone(''); setEmail(''); setCompanyName(''); setCnpj(''); setSegment('')
    setStatus('ATIVO'); setLifetimeValue('0'); setAssignedToId('_none_')
  }

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Informe o nome do cliente.'); return }
    if (!phone.trim()) { toast.error('Informe o telefone/WhatsApp do cliente.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, email, companyName, cnpj, segment, status,
          lifetimeValue: lifetimeValue === '' ? 0 : Number(lifetimeValue),
          assignedToId: assignedToId === '_none_' ? null : assignedToId,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Cliente cadastrado!')
      setOpen(false)
      reset()
      router.refresh()
    } catch { toast.error('Não foi possível cadastrar o cliente.') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><UserPlus className="h-4 w-4" /> Novo Cliente</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Cadastre um novo cliente manualmente na sua base.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="n-name">Nome *</Label>
              <Input id="n-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="n-phone">Telefone/WhatsApp *</Label>
              <Input id="n-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="n-email">Email</Label>
              <Input id="n-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="n-company">Empresa</Label>
              <Input id="n-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Razão social" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="n-cnpj">CNPJ</Label>
              <Input id="n-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="n-segment">Segmento</Label>
              <Input id="n-segment" value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex.: Gestor de Tráfego | Curitiba - PR" className="mt-1.5" />
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
              <Label htmlFor="n-ltv">Valor lifetime (R$)</Label>
              <Input id="n-ltv" type="number" min={0} value={lifetimeValue} onChange={(e) => setLifetimeValue(e.target.value)} placeholder="0,00" className="mt-1.5" />
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Sem responsável</SelectItem>
                  {(members ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Salvar cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}