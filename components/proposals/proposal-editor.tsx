'use client'

import React, { useState, useEffect } from 'react'
import { ProposalData, Template, INITIAL_DATA, ServiceItem } from '@/lib/proposal-types'
import { Plus, Trash2, Download, Save, LayoutTemplate, Calculator, CheckCircle2, UserCheck, Package, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ClientOption {
  id: string
  name: string
  email?: string | null
  phone?: string | null
}

interface LeadOption {
  id: string
  name: string
  email?: string | null
  phone?: string | null
}

interface CatalogOption {
  id: string
  name: string
  price: number
  description?: string | null
}

interface Props {
  data: ProposalData
  onChange: (data: ProposalData) => void
  onPrint: () => void
  onSave?: () => void
  isSaving?: boolean
  publicUrl?: string
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tpl_padrao',
    name: 'Modelo Padrão de Serviços',
    data: INITIAL_DATA,
  },
]

export const ProposalEditor: React.FC<Props> = ({
  data,
  onChange,
  onPrint,
  onSave,
  isSaving,
  publicUrl,
}) => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [newTemplateName, setNewTemplateName] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [autoSum, setAutoSum] = useState(true)

  // External options from CRM
  const [clients, setClients] = useState<ClientOption[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogOption[]>([])

  // Load CRM data (Clients, Leads, Catalog)
  useEffect(() => {
    async function loadCrmData() {
      try {
        const [resClients, resLeads, resCatalog] = await Promise.all([
          fetch('/api/clients').then((r) => (r.ok ? r.json() : [])),
          fetch('/api/conversations?limit=100').then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch('/api/catalog').then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ])

        if (Array.isArray(resClients)) {
          setClients(resClients.map((c: any) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone })))
        }
        if (Array.isArray(resCatalog)) {
          setCatalogItems(resCatalog.map((c: any) => ({ id: c.id, name: c.name, price: c.price, description: c.description })))
        }
      } catch (err) {
        console.error('[ProposalEditor] Error loading CRM options', err)
      }
    }
    loadCrmData()
  }, [])

  // Load saved templates
  useEffect(() => {
    const saved = localStorage.getItem('hermes_proposal_templates')
    if (saved) {
      try {
        setTemplates(JSON.parse(saved))
      } catch {
        setTemplates(DEFAULT_TEMPLATES)
      }
    } else {
      setTemplates(DEFAULT_TEMPLATES)
    }
  }, [])

  // Recalculate subtotal and final price when items change
  useEffect(() => {
    if (!autoSum) return
    const itemsTotal = (data.serviceItems || []).reduce(
      (acc, item) => acc + (item.quantity ?? 1) * (item.price || 0),
      0
    )
    const discount = data.discount ?? 0
    const calculatedFinal = Math.max(0, itemsTotal - discount)

    if (itemsTotal !== data.subtotal || calculatedFinal !== data.finalPrice) {
      onChange({
        ...data,
        subtotal: itemsTotal,
        finalPrice: calculatedFinal,
      })
    }
  }, [data.serviceItems, data.discount, autoSum])

  const addItem = () => {
    const newItem: ServiceItem = {
      id: Date.now().toString(),
      description: 'Novo entregável',
      quantity: 1,
      price: 0,
    }
    onChange({ ...data, serviceItems: [...data.serviceItems, newItem] })
  }

  const updateItem = (index: number, field: keyof ServiceItem, value: any) => {
    const newItems = [...data.serviceItems]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange({ ...data, serviceItems: newItems })
  }

  const removeItem = (index: number) => {
    const newItems = data.serviceItems.filter((_, i) => i !== index)
    onChange({ ...data, serviceItems: newItems })
  }

  // Handle Client/Lead Selection
  const handleRecipientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (!val) return

    const [type, id] = val.split(':')
    if (type === 'client') {
      const c = clients.find((item) => item.id === id)
      if (c) {
        onChange({
          ...data,
          recipientType: 'client',
          clientId: c.id,
          leadId: null,
          clientName: c.name,
          clientEmail: c.email || '',
          clientPhone: c.phone || '',
        })
      }
    } else if (type === 'lead') {
      const l = leads.find((item) => item.id === id)
      if (l) {
        onChange({
          ...data,
          recipientType: 'lead',
          clientId: null,
          leadId: l.id,
          clientName: l.name,
          clientEmail: l.email || '',
          clientPhone: l.phone || '',
        })
      }
    }
  }

  // Handle Catalog Item Selection
  const handleCatalogSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value
    if (!catId) return

    const item = catalogItems.find((c) => c.id === catId)
    if (item) {
      const newItems: ServiceItem[] = [
        {
          id: Date.now().toString(),
          description: item.description || item.name,
          quantity: 1,
          price: item.price,
        },
      ]
      onChange({
        ...data,
        catalogItemId: item.id,
        serviceTitle: item.name,
        serviceItems: newItems,
        subtotal: item.price,
        finalPrice: item.price,
      })
      toast.success(`Produto "${item.name}" selecionado!`)
    }
  }

  const loadTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tplId = e.target.value
    if (!tplId) return
    const tpl = templates.find((t) => t.id === tplId)
    if (tpl) {
      onChange({
        ...tpl.data,
        companyName: data.companyName || tpl.data.companyName,
        companyLogo: data.companyLogo || tpl.data.companyLogo,
        companyColor: data.companyColor || tpl.data.companyColor,
      })
      toast.success(`Modelo "${tpl.name}" carregado!`)
    }
  }

  const saveTemplate = () => {
    if (!newTemplateName.trim()) return
    const newTpl: Template = {
      id: Date.now().toString(),
      name: newTemplateName,
      data: { ...data },
    }
    const updated = [...templates, newTpl]
    setTemplates(updated)
    localStorage.setItem('hermes_proposal_templates', JSON.stringify(updated))
    setNewTemplateName('')
    setShowSaveTemplate(false)
    toast.success('Modelo salvo com sucesso!')
  }

  const copyPublicLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl)
      toast.success('Link público copiado!')
    } else {
      toast.info('Salve o orçamento para gerar o link público.')
    }
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-neutral-200 dark:border-zinc-800 shadow-xl overflow-hidden font-['Inter'] text-neutral-800 dark:text-zinc-200">
      {/* Top Action Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-900 sticky top-0 z-20 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Editor de Orçamento</h2>
          <div className="flex gap-2">
            {onSave && (
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700 text-white h-9"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
            <Button
              onClick={onPrint}
              variant="outline"
              className="h-9 border-neutral-300 dark:border-zinc-700"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {publicUrl && (
          <button
            onClick={copyPublicLink}
            className="flex items-center justify-center gap-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 py-1.5 px-3 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors w-full"
          >
            <Copy size={12} /> Copiar Link Público (para enviar ao cliente)
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Seção 1: Modelos Prontos */}
        <section className="bg-neutral-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-3 text-purple-600 dark:text-purple-400">
            <LayoutTemplate size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Modelos Prontos</h3>
          </div>

          <div className="space-y-3">
            <select
              onChange={loadTemplate}
              className="w-full bg-white dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              defaultValue=""
            >
              <option value="" disabled>Selecione um modelo...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {!showSaveTemplate ? (
              <button
                onClick={() => setShowSaveTemplate(true)}
                className="w-full py-2 text-xs font-medium text-neutral-500 dark:text-zinc-400 hover:text-purple-600 border border-dashed border-neutral-300 dark:border-zinc-700 rounded-lg transition-all"
              >
                + Salvar orçamento atual como modelo
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome do modelo..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-neutral-900 dark:text-zinc-100"
                />
                <button
                  onClick={saveTemplate}
                  className="p-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700"
                >
                  <Save size={16} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Seção 2: Cliente / Lead */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-neutral-400">
            <UserCheck size={14} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Cliente ou Lead</h3>
          </div>

          {clients.length > 0 && (
            <div>
              <label className="block text-xs text-neutral-500 dark:text-zinc-400 mb-1">Selecionar do CRM</label>
              <select
                onChange={handleRecipientSelect}
                className="w-full bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                defaultValue=""
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((c) => (
                  <option key={`client:${c.id}`} value={`client:${c.id}`}>👤 {c.name} (Cliente)</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-neutral-500 dark:text-zinc-400 mb-1">Nome do Destinatário</label>
            <input
              type="text"
              value={data.clientName}
              onChange={(e) => onChange({ ...data, clientName: e.target.value })}
              placeholder="Ex: João da Silva / Empresa XYZ"
              className="w-full bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </section>

        {/* Seção 3: Serviço & Catálogo */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-neutral-400">
            <Package size={14} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Serviço & Catálogo</h3>
          </div>

          {catalogItems.length > 0 && (
            <div>
              <label className="block text-xs text-neutral-500 dark:text-zinc-400 mb-1">Puxar do Catálogo de Produtos</label>
              <select
                onChange={handleCatalogSelect}
                className="w-full bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                defaultValue=""
              >
                <option value="">Selecione do catálogo...</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>📦 {item.name} — R$ {item.price.toFixed(2)}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-neutral-500 dark:text-zinc-400 mb-1">Título do Serviço</label>
            <input
              type="text"
              value={data.serviceTitle}
              onChange={(e) => onChange({ ...data, serviceTitle: e.target.value })}
              className="w-full bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </section>

        {/* Seção 4: Entregáveis e Valores */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Entregáveis & Valores</h3>
            <button
              onClick={addItem}
              className="text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              <Plus size={14} /> Adicionar Item
            </button>
          </div>

          <div className="space-y-2">
            {data.serviceItems.map((item, idx) => (
              <div key={item.id || idx} className="flex gap-2 items-center bg-neutral-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-neutral-200 dark:border-zinc-800">
                <input
                  type="text"
                  value={item.description}
                  placeholder="Descrição do item / entregável"
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded px-2 py-1 text-xs text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <input
                  type="number"
                  min="1"
                  value={item.quantity ?? 1}
                  placeholder="Qtd"
                  onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-14 bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded px-2 py-1 text-xs text-neutral-900 dark:text-zinc-100 text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <div className="relative w-24">
                  <span className="absolute left-1.5 top-1 text-[10px] text-neutral-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price || ''}
                    placeholder="0.00"
                    onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded pl-6 pr-2 py-1 text-xs text-neutral-900 dark:text-zinc-100 text-right focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-neutral-400 hover:text-red-500 p-1 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Seção 5: Investimento Final */}
        <section className="space-y-3 bg-neutral-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Resumo do Investimento</h3>
            <button
              onClick={() => setAutoSum(!autoSum)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                autoSum ? 'bg-purple-100 dark:bg-purple-950 text-purple-600 border-purple-300' : 'bg-neutral-200 text-neutral-500'
              }`}
            >
              <Calculator size={10} className="inline mr-1" />
              Soma Auto {autoSum ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 dark:text-zinc-400 mb-1">Desconto (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={data.discount || ''}
                placeholder="0.00"
                onChange={(e) => onChange({ ...data, discount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">Valor Final (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={data.finalPrice}
                onChange={(e) => onChange({ ...data, finalPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white dark:bg-zinc-800 border border-purple-400 dark:border-purple-600 rounded-lg px-3 py-1.5 text-sm font-bold text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </section>

        {/* Seção 6: Condições & Observações */}
        <section className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-500 dark:text-zinc-400 mb-1">Condições de Pagamento</label>
            <input
              type="text"
              value={data.paymentTerms || ''}
              onChange={(e) => onChange({ ...data, paymentTerms: e.target.value })}
              placeholder="Ex: 50% de entrada + 2x no cartão"
              className="w-full bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 dark:text-zinc-400 mb-1">Observações / Validade</label>
            <textarea
              rows={3}
              value={data.observations}
              onChange={(e) => onChange({ ...data, observations: e.target.value })}
              className="w-full bg-white dark:bg-zinc-800 border border-neutral-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs text-neutral-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Observações finais, regras ou prazo de validade..."
            />
          </div>
        </section>
      </div>
    </div>
  )
}
