'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PageHeading } from '@/components/layout/page-heading'
import { useViewRole } from '@/components/providers/view-role-provider'
import { toast } from 'sonner'
import { Check, ShieldAlert, Loader2, Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'
import { CONTRACT_VARIABLES } from '@/lib/crm-constants'

export default function ContractTemplatesPage() {
  const { can } = useViewRole()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<any[]>([])
  
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contract-templates')
      if (!res.ok) {
        let detail = `Status ${res.status}`
        try {
          const errData = await res.json()
          if (errData?.detail) detail = errData.detail
          else if (errData?.error) detail = errData.error
        } catch {}
        toast.error(`Não foi possível carregar os modelos. (${detail})`)
        setTemplates([])
        return
      }
      const data = await res.json()
      setTemplates(data.templates || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  if (!can('settings:branding')) {
    return (
      <div>
        <PageHeading title="Modelos de Contrato" description="Gerencie seus modelos de contratos." />
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Acesso restrito</p>
          <p className="max-w-sm text-sm text-muted-foreground">Apenas administradores podem alterar os modelos de contrato.</p>
        </Card>
      </div>
    )
  }

  const handleSave = async () => {
    if (!editing?.name || !editing?.body) {
      toast.error('Preencha o nome e o corpo do contrato')
      return
    }
    
    setSaving(true)
    try {
      const url = editing.id ? `/api/contract-templates/${editing.id}` : '/api/contract-templates'
      const method = editing.id ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      
      if (!res.ok) {
        let detail = 'Erro ao salvar'
        try {
          const errData = await res.json()
          if (errData?.detail) detail = errData.detail
          else if (errData?.error) detail = errData.error
        } catch {}
        throw new Error(detail)
      }
      toast.success('Modelo salvo com sucesso!')
      setEditing(null)
      fetchTemplates()
    } catch (e) {
      toast.error(`Não foi possível salvar o modelo.${e instanceof Error && e.message && e.message !== 'Erro ao salvar' ? ` (${e.message})` : ''}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este modelo?')) return
    
    try {
      const res = await fetch(`/api/contract-templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      toast.success('Modelo excluído com sucesso!')
      fetchTemplates()
    } catch (e) {
      toast.error('Não foi possível excluir o modelo.')
    }
  }

  const insertVariable = (token: string) => {
    if (!editing) return
    const body = editing.body || ''
    setEditing({ ...editing, body: body + token })
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <PageHeading
          title={editing.id ? 'Editar Modelo' : 'Novo Modelo'}
          description="Utilize as variáveis ao lado para preenchimento automático."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar
              </Button>
            </div>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 space-y-4 lg:col-span-2">
            <div>
              <Label>Nome do Modelo</Label>
              <Input value={editing.name || ''} onChange={e => setEditing({...editing, name: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={editing.description || ''} onChange={e => setEditing({...editing, description: e.target.value})} className="mt-1.5" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={editing.isDefault || false} onChange={e => setEditing({...editing, isDefault: e.target.checked})} />
              <Label htmlFor="isDefault" className="cursor-pointer">Definir como modelo padrão</Label>
            </div>
            
            <div className="pt-2">
              <Label>Corpo do Contrato</Label>
              <Textarea 
                value={editing.body || ''} 
                onChange={e => setEditing({...editing, body: e.target.value})} 
                className="mt-1.5 min-h-[400px] font-mono text-sm" 
              />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4">Variáveis Disponíveis</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em uma variável para inseri-la no final do contrato ou copie e cole no local desejado.
            </p>
            
            <div className="space-y-6">
              {CONTRACT_VARIABLES.map(group => (
                <div key={group.group}>
                  <h4 className="text-sm font-medium mb-2">{group.group}</h4>
                  <div className="flex flex-col gap-1.5">
                    {group.items.map(item => (
                      <button
                        key={item.token}
                        onClick={() => insertVariable(item.token)}
                        className="text-left text-xs bg-muted/50 hover:bg-muted p-2 rounded border border-transparent hover:border-border transition-colors flex justify-between"
                      >
                        <span className="font-medium text-muted-foreground">{item.label}</span>
                        <code className="text-primary">{item.token}</code>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Modelos de Contrato"
        description="Crie modelos com variáveis que serão preenchidos automaticamente com os dados dos seus clientes."
        actions={
          <Button onClick={() => setEditing({ name: '', body: '' })} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Modelo
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>Nenhum modelo cadastrado.</p>
            <Button variant="link" onClick={() => setEditing({ name: '', body: '' })}>Criar primeiro modelo</Button>
          </div>
        ) : (
          <div className="divide-y">
            {templates.map(tpl => (
              <div key={tpl.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tpl.name}</span>
                    {tpl.isDefault && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">PADRÃO</span>}
                  </div>
                  {tpl.description && <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(tpl)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(tpl.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
