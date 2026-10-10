'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeading } from '@/components/layout/page-heading'
import { toast } from 'sonner'
import { Plus, FileText, Loader2, ArrowRight, MessageSquare, Mail, CheckCircle2 } from 'lucide-react'
import { CONTRACT_STATUS_META } from '@/lib/crm-constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

export default function ContractsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contracts, setContracts] = useState<any[]>([])
  
  // New Contract Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])

  const [newContractData, setNewContractData] = useState({ 
    clientId: '', 
    templateId: '', 
    title: '', 
    totalValue: '', 
    services: '', 
    paymentTerms: '',
    proposalId: '',
    projectId: '',
    installmentCount: '1',
    createProject: true
  })
  const [creating, setCreating] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resContracts, resClients, resTemplates, resProposals, resProjects] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/clients'),
        fetch('/api/contract-templates'),
        fetch('/api/proposals'),
        fetch('/api/projects')
      ])
      const dataContracts = await resContracts.json()
      const dataClients = await resClients.json()
      const dataTemplates = await resTemplates.json()
      const dataProposals = await resProposals.json()
      const dataProjects = await resProjects.json()
      
      setContracts(dataContracts.contracts || [])
      setClients(dataClients.clients || [])
      setTemplates(dataTemplates.templates || [])
      setProposals(dataProposals.proposals || [])
      setProjects(Array.isArray(dataProjects) ? dataProjects : dataProjects.projects || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Função para auto-gerar título inteligente do contrato
  const generateAutoTitle = (clientId?: string, templateId?: string, customService?: string) => {
    const now = new Date()
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const monthYear = `${now.getFullYear()} ${months[now.getMonth()]}`
    
    const client = clients.find(c => c.id === clientId)
    const template = templates.find(t => t.id === templateId)

    const serviceName = customService || template?.name || 'Prestação de Serviços'
    const clientName = client?.name ? `, ${client.name}` : ''

    return `Contrato de ${serviceName}${clientName} - ${monthYear}`
  }

  const handleSelectClient = (clientId: string) => {
    const autoTitle = generateAutoTitle(clientId, newContractData.templateId)
    setNewContractData(prev => ({
      ...prev,
      clientId,
      title: prev.title && !prev.title.startsWith('Contrato de') ? prev.title : autoTitle
    }))
  }

  const handleSelectProposal = (proposalId: string) => {
    if (!proposalId || proposalId === '_none_') {
      setNewContractData(prev => ({ ...prev, proposalId: '' }))
      return
    }

    const proposal = proposals.find(p => p.id === proposalId)
    if (!proposal) return

    let parsedData: any = {}
    try {
      parsedData = typeof proposal.data === 'string' ? JSON.parse(proposal.data) : proposal.data
    } catch (e) {}

    const importedServices = (parsedData.items || []).map((item: any) => item.description || item.title || '').join('\n')
    const importedTotal = parsedData.items 
      ? parsedData.items.reduce((acc: number, item: any) => acc + (parseFloat(item.total) || parseFloat(item.price) || 0), 0).toFixed(2)
      : ''

    const matchedClient = clients.find(c => c.id === proposal.clientId || c.name?.toLowerCase() === parsedData.clientName?.toLowerCase())
    const targetClientId = matchedClient ? matchedClient.id : newContractData.clientId

    const autoTitle = generateAutoTitle(targetClientId, undefined, parsedData.title || 'Orçamento Aprovado')

    setNewContractData(prev => ({
      ...prev,
      proposalId,
      clientId: targetClientId,
      totalValue: importedTotal || prev.totalValue,
      services: importedServices || prev.services,
      paymentTerms: parsedData.paymentTerms || prev.paymentTerms,
      title: autoTitle
    }))
    toast.success('Dados do Orçamento importados com sucesso!')
  }

  const handleSelectProject = (projectId: string) => {
    if (!projectId || projectId === '_none_') {
      setNewContractData(prev => ({ ...prev, projectId: '' }))
      return
    }

    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const autoTitle = generateAutoTitle(project.clientId, undefined, project.name)

    setNewContractData(prev => ({
      ...prev,
      projectId,
      clientId: project.clientId || prev.clientId,
      totalValue: project.totalValue ? String(project.totalValue) : prev.totalValue,
      title: autoTitle
    }))
    toast.success('Dados do Projeto importados!')
  }

  const handleSendWhatsApp = (phone?: string, title?: string, publicToken?: string) => {
    if (!phone) {
      toast.error('Cliente não possui telefone/WhatsApp cadastrado')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    const msg = `Olá! Segue o link para visualizar e assinar o seu documento (${title}):\n${window.location.origin}/signature/${publicToken || ''}`
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleSendEmail = (email?: string, title?: string) => {
    if (!email) {
      toast.error('Cliente não possui e-mail cadastrado')
      return
    }
    const subject = `Documento Disponível: ${title}`
    const body = `Olá!\n\nSeu documento (${title}) já está pronto.\n\nAcesse nosso portal para visualizar e assinar.`
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const handleCreate = async () => {
    if (!newContractData.clientId) {
      toast.error('Selecione um cliente')
      return
    }
    
    setCreating(true)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newContractData,
          templateId: newContractData.templateId === '_none_' ? null : newContractData.templateId,
          totalValue: newContractData.totalValue ? parseFloat(newContractData.totalValue) : null,
          services: newContractData.services
            ? newContractData.services.split('\n').map(line => line.trim()).filter(Boolean).map((description, i) => ({ description, quantity: 1, unitPrice: 0 }))
            : [],
          paymentTerms: newContractData.paymentTerms || null
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar')
      
      toast.success('Contrato gerado com sucesso!')
      setIsNewModalOpen(false)
      fetchData()
      router.push(`/contracts/${data.contract.id}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Contratos"
        description="Gerencie os contratos gerados e as assinaturas."
        actions={
          <Button onClick={() => setIsNewModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Contrato
          </Button>
        }
      />

      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contracts">Contratos Assinados</TabsTrigger>
          <TabsTrigger value="proposals">Orçamentos (PDF)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : contracts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum contrato gerado ainda.</p>
                <Button variant="link" onClick={() => setIsNewModalOpen(true)}>Gerar primeiro contrato</Button>
              </div>
            ) : (
              <div className="divide-y">
                {contracts.map(contract => (
                  <div key={contract.id} className="hover:bg-muted/50 transition-colors p-4 flex items-center justify-between">
                    <Link href={`/contracts/${contract.id}`} className="flex-1">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-primary">{contract.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTRACT_STATUS_META[contract.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                            {CONTRACT_STATUS_META[contract.status]?.label || contract.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Cliente: {contract.client?.name || 'N/A'} • 
                          Data: {new Date(contract.createdAt).toLocaleDateString('pt-BR')}
                          {contract.totalValue && ` • R$ ${contract.totalValue.toFixed(2)}`}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" title="Enviar WhatsApp" onClick={() => handleSendWhatsApp(contract.client?.phone, contract.title, contract.publicToken)}>
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Enviar E-mail" onClick={() => handleSendEmail(contract.client?.email, contract.title)}>
                        <Mail className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Link href={`/contracts/${contract.id}`}>
                        <Button variant="outline" size="sm">Abrir</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="proposals" className="space-y-4">
          <div className="flex justify-end">
             <Button onClick={() => router.push('/contracts/proposals/new')} className="bg-[#ac84ff] hover:bg-[#ac84ff]/90 text-white border-0">
               <Plus className="h-4 w-4 mr-2" /> Novo Orçamento
             </Button>
          </div>
          <Card>
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : proposals.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhum orçamento gerado ainda.</p>
                <Button variant="link" onClick={() => router.push('/contracts/proposals/new')}>Gerar primeiro orçamento</Button>
              </div>
            ) : (
              <div className="divide-y">
                {proposals.map(proposal => (
                  <div key={proposal.id} className="block hover:bg-muted/50 transition-colors p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-primary">{proposal.title || 'Orçamento sem título'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700`}>
                            {proposal.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {proposal.client?.name ? `Cliente: ${proposal.client.name}` : proposal.lead?.name ? `Lead: ${proposal.lead.name}` : 'N/A'} • 
                          Data: {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/contracts/proposals/${proposal.id}`)}>
                          Abrir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Novo Contrato</DialogTitle>
            <DialogDescription>
              Preencha os dados ou importe diretamente de um Orçamento/Projeto cadastrado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            {/* Importação de Origem */}
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Importar de Orçamento</Label>
                <Select value={newContractData.proposalId} onValueChange={handleSelectProposal}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Selecione um orçamento..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">(Nenhum)</SelectItem>
                    {proposals.map(p => <SelectItem key={p.id} value={p.id}>{p.title || `Orçamento #${p.id.slice(-4)}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground">Importar de Projeto</Label>
                <Select value={newContractData.projectId} onValueChange={handleSelectProject}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Selecione um projeto..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">(Nenhum)</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cliente */}
            <div>
              <Label>Cliente *</Label>
              <Select value={newContractData.clientId} onValueChange={handleSelectClient}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients.length === 0 ? (
                    <SelectItem value="_empty_" disabled>Nenhum cliente cadastrado</SelectItem>
                  ) : (
                    clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Modelo de Contrato */}
            <div>
              <Label>Modelo de Contrato (Opcional)</Label>
              <Select value={newContractData.templateId} onValueChange={v => {
                setNewContractData(prev => ({
                  ...prev,
                  templateId: v,
                  title: generateAutoTitle(prev.clientId, v)
                }))
              }}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">(Contrato em branco)</SelectItem>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} {t.isDefault ? '(Padrão)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Título com geração automática */}
            <div>
              <Label>Título do Contrato</Label>
              <Input 
                placeholder="Ex: Contrato de Prestação de Serviços - Cliente - 2026" 
                value={newContractData.title} 
                onChange={e => setNewContractData({...newContractData, title: e.target.value})} 
                className="mt-1.5" 
              />
            </div>

            {/* Valores e Parcelas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Total (R$)</Label>
                <Input 
                  type="number" step="0.01" 
                  placeholder="0.00"
                  value={newContractData.totalValue} 
                  onChange={e => setNewContractData({...newContractData, totalValue: e.target.value})} 
                  className="mt-1.5" 
                />
              </div>

              <div>
                <Label>Nº de Parcelas</Label>
                <Input 
                  type="number" min="1" max="60"
                  value={newContractData.installmentCount} 
                  onChange={e => setNewContractData({...newContractData, installmentCount: e.target.value})} 
                  className="mt-1.5" 
                />
              </div>
            </div>

            {/* Checkbox Criar Projeto no Financeiro */}
            <div className="flex items-center space-x-2 bg-blue-50/50 p-3 rounded-md border border-blue-100">
              <Checkbox 
                id="createProject" 
                checked={newContractData.createProject} 
                onCheckedChange={(checked) => setNewContractData({...newContractData, createProject: !!checked})}
              />
              <Label htmlFor="createProject" className="text-sm font-medium text-blue-900 cursor-pointer">
                Criar Projeto e parcelas no Financeiro (Fluxo de Caixa) automaticamente
              </Label>
            </div>

            {/* Serviços e Condições */}
            <div>
              <Label>Serviços (um por linha)</Label>
              <Textarea
                placeholder="Ex: Criação de site institucional"
                value={newContractData.services}
                onChange={e => setNewContractData({...newContractData, services: e.target.value})}
                className="mt-1.5 font-mono text-sm min-h-[80px]"
              />
            </div>

            <div>
              <Label>Condições de Pagamento</Label>
              <Input
                placeholder="Ex: 30% na assinatura e o restante em 3x no boleto"
                value={newContractData.paymentTerms}
                onChange={e => setNewContractData({...newContractData, paymentTerms: e.target.value})}
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2 bg-primary">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Gerar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
