'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PageHeading } from '@/components/layout/page-heading'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Check, Send, Trash2, RefreshCw, Copy, ExternalLink } from 'lucide-react'
import { CONTRACT_STATUS_META } from '@/lib/crm-constants'
import { ContractContent } from '@/components/contracts/contract-content'
import Link from 'next/link'

export default function ContractReviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contract, setContract] = useState<any>(null)
  
  const [bodyRendered, setBodyRendered] = useState('')
  const [saving, setSaving] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sending, setSending] = useState(false)

  const fetchContract = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${params.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContract(data.contract)
      setBodyRendered(data.contract.bodyRendered || '')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContract()
  }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/contracts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bodyRendered }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Rascunho salvo com sucesso!')
      fetchContract()
    } catch (e) {
      toast.error('Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleReRender = async () => {
    setRendering(true)
    try {
      const res = await fetch(`/api/contracts/${params.id}/render`, { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao atualizar')
      toast.success('Contrato atualizado com base nos dados mais recentes!')
      fetchContract()
    } catch (e) {
      toast.error('Não foi possível re-processar o contrato.')
    } finally {
      setRendering(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Deseja realmente excluir este rascunho? Esta ação não pode ser desfeita.')) return
    
    setDeleting(true)
    try {
      const res = await fetch(`/api/contracts/${params.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      toast.success('Rascunho excluído com sucesso!')
      router.push('/contracts')
    } catch (e) {
      toast.error('Não foi possível excluir.')
      setDeleting(false)
    }
  }

  const handleSend = async () => {
    if (!confirm('Ao enviar, você (prestador) estará assinando digitalmente o documento e ele não poderá mais ser alterado. Deseja continuar?')) return
    
    setSending(true)
    try {
      const res = await fetch(`/api/contracts/${params.id}/sign/provider`, { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao assinar como prestador')
      toast.success('Contrato assinado por você! Compartilhe o link com o cliente.')
      fetchContract()
    } catch (e) {
      toast.error('Não foi possível enviar para assinatura.')
    } finally {
      setSending(false)
    }
  }

  const copyPublicLink = () => {
    const url = `${window.location.origin}/public/contracts/${contract.id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado para a área de transferência!')
  }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!contract) return <div className="p-12 text-center">Contrato não encontrado</div>

  const isDraft = contract.status === 'DRAFT'
  const isPendingClient = contract.status === 'PENDING_CLIENT'

  return (
    <div className="space-y-6">
      <PageHeading
        title={contract.title || 'Revisão de Contrato'}
        description={`Cliente: ${contract.client?.name || 'N/A'}`}
        actions={
          <div className="flex gap-2">
            <Link href="/contracts">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
            </Link>
            
            {isDraft && (
              <>
                <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Excluir
                </Button>
                <Button variant="outline" onClick={handleReRender} disabled={rendering}>
                  {rendering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Atualizar Variáveis
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar Rascunho
                </Button>
                <Button onClick={handleSend} disabled={sending} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Finalizar e Enviar
                </Button>
              </>
            )}
            
            {!isDraft && (
              <>
                <Button variant="outline" onClick={copyPublicLink} className="gap-2">
                  <Copy className="h-4 w-4" /> Copiar Link Público
                </Button>
                <Button onClick={() => window.open(`/public/contracts/${contract.id}/pdf`, '_blank')} className="gap-2">
                  Ver PDF
                </Button>
              </>
            )}
          </div>
        }
      />

      {isPendingClient && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between mb-6">
          <div>
            <p className="font-medium">Aguardando assinatura do cliente</p>
            <p className="text-sm opacity-90">Envie este link para o cliente revisar e assinar o documento.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-white dark:bg-black/20 px-2 py-1 rounded hidden sm:block">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/public/contracts/${contract.id}`}
            </code>
            <Button size="sm" variant="secondary" onClick={copyPublicLink} className="gap-2">
              <Copy className="h-4 w-4" /> Copiar
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden border">
            <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
              <span className="font-semibold text-sm">Documento</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTRACT_STATUS_META[contract.status]?.color}`}>
                {CONTRACT_STATUS_META[contract.status]?.label || contract.status}
              </span>
            </div>
            <div className="p-4 bg-white dark:bg-zinc-950">
              {isDraft ? (
                <Textarea 
                  value={bodyRendered} 
                  onChange={e => setBodyRendered(e.target.value)} 
                  className="min-h-[600px] font-serif resize-y border-0 focus-visible:ring-0 p-0 text-base" 
                  placeholder="Conteúdo do contrato..."
                />
              ) : (
                <ContractContent content={contract.bodyRendered} className="min-h-[600px]" />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold border-b pb-2">Detalhes</h3>
            <div className="text-sm space-y-2">
              <div><span className="text-muted-foreground">Valor Total:</span> {contract.totalValue ? `R$ ${contract.totalValue.toFixed(2)}` : 'Não definido'}</div>
              <div><span className="text-muted-foreground">Forma de Pagto:</span> {contract.paymentTerms || 'Não definido'}</div>
              <div><span className="text-muted-foreground">Serviços:</span> {contract.services?.length || 0} adicionados</div>
              <div><span className="text-muted-foreground">Data de Criação:</span> {new Date(contract.createdAt).toLocaleDateString('pt-BR')}</div>
              <div><span className="text-muted-foreground">Hash Documento:</span> <span className="font-mono text-[10px] break-all">{contract.contentHash}</span></div>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold border-b pb-2">Histórico de Assinaturas</h3>
            {contract.signatures?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma assinatura ainda.</p>
            ) : (
              <div className="space-y-3">
                {contract.signatures?.map((sig: any) => (
                  <div key={sig.id} className="text-sm border rounded p-3">
                    <div className="font-medium">{sig.name} ({sig.role === 'PROVIDER' ? 'Prestador' : 'Cliente'})</div>
                    <div className="text-xs text-muted-foreground mt-1">Status: {sig.status}</div>
                    {sig.signedAt && <div className="text-xs text-muted-foreground">Assinado em: {new Date(sig.signedAt).toLocaleString('pt-BR')}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
