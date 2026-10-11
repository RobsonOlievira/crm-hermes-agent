'use client'

import { useState } from 'react'
import {
  Send,
  Plus,
  Megaphone,
  FileCode,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LEAD_STATUS_META } from '@/lib/crm-constants'
import { toast } from 'sonner'

export interface WaTemplateRow {
  id: string
  name: string
  language: string
  category: string
  bodyText: string
  variablesCount: number
  status: string
  createdAt: string
}

export interface WaBroadcastRow {
  id: string
  title: string
  status: string
  totalRecipients: number
  totalSent: number
  totalFailed: number
  sentAt: string | null
  createdAt: string
  template: {
    id: string
    name: string
    language: string
    bodyText: string
  }
}

export interface LeadTypeOption {
  id: string
  label: string
  color: string
}

interface Props {
  initialTemplates: WaTemplateRow[]
  initialBroadcasts: WaBroadcastRow[]
  leadTypesOptions: LeadTypeOption[]
}

const STATUS_OPTIONS = Object.entries(LEAD_STATUS_META).map(([key, val]) => ({
  value: key,
  label: val.label,
}))

export function BroadcastManager({ initialTemplates, initialBroadcasts, leadTypesOptions }: Props) {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'templates'>('broadcasts')
  const [templates, setTemplates] = useState<WaTemplateRow[]>(initialTemplates)
  const [broadcasts, setBroadcasts] = useState<WaBroadcastRow[]>(initialBroadcasts)

  // Modais
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
  const [showNewBroadcastModal, setShowNewBroadcastModal] = useState(false)

  // Form de Template
  const [templateName, setTemplateName] = useState('')
  const [templateLang, setTemplateLang] = useState('pt_BR')
  const [templateCategory, setTemplateCategory] = useState('MARKETING')
  const [templateBody, setTemplateBody] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // Form de Disparo
  const [broadcastTitle, setBroadcastTitle] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [filterLeadTypeId, setFilterLeadTypeId] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({})
  const [creatingBroadcast, setCreatingBroadcast] = useState(false)
  const [executingId, setExecutingId] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // ---- Atualizar lista de templates ----
  const refreshTemplates = async () => {
    try {
      const res = await fetch('/api/whatsapp/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates ?? [])
      }
    } catch {
      /* ignore */
    }
  }

  // ---- Atualizar lista de disparos ----
  const refreshBroadcasts = async () => {
    try {
      const res = await fetch('/api/whatsapp/broadcasts')
      if (res.ok) {
        const data = await res.json()
        setBroadcasts(data.broadcasts ?? [])
      }
    } catch {
      /* ignore */
    }
  }

  // ---- Salvar Novo Template ----
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !templateBody.trim()) {
      toast.error('Preencha o nome exato do template no Meta e o texto do corpo.')
      return
    }

    setSavingTemplate(true)
    try {
      const res = await fetch('/api/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          language: templateLang,
          category: templateCategory,
          bodyText: templateBody,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao cadastrar template')
      }

      toast.success('Template Meta cadastrado com sucesso!')
      setTemplateName('')
      setTemplateBody('')
      setShowNewTemplateModal(false)
      await refreshTemplates()
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao salvar template')
    } finally {
      setSavingTemplate(false)
    }
  }

  // ---- Salvar e Disparar Campanha ----
  const handleCreateBroadcast = async (autoExecute = false) => {
    if (!broadcastTitle.trim() || !selectedTemplateId) {
      toast.error('Informe um título e selecione um Template Meta.')
      return
    }

    setCreatingBroadcast(true)
    try {
      const res = await fetch('/api/whatsapp/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          templateId: selectedTemplateId,
          targetFilters: {
            leadTypeId: filterLeadTypeId || undefined,
            status: filterStatus || undefined,
            period: filterPeriod || undefined,
          },
          variableMapping,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar disparo')
      }

      const data = await res.json()
      toast.success(`Disparo criado para ${data.recipientCount} lead(s)!`)
      
      setShowNewBroadcastModal(false)
      setBroadcastTitle('')
      setSelectedTemplateId('')
      setVariableMapping({})
      await refreshBroadcasts()

      if (autoExecute && data.broadcast?.id) {
        await handleExecuteBroadcast(data.broadcast.id)
      }
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao criar disparo')
    } finally {
      setCreatingBroadcast(false)
    }
  }

  // ---- Executar Disparo ----
  const handleExecuteBroadcast = async (broadcastId: string) => {
    setExecutingId(broadcastId)
    try {
      const res = await fetch(`/api/whatsapp/broadcasts/${broadcastId}/execute`, {
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Falha ao executar disparo')
      }

      const data = await res.json()
      toast.success(`Disparo concluído! ${data.totalSent} mensagens enviadas.`)
      await refreshBroadcasts()
    } catch (e: any) {
      toast.error(e?.message || 'Erro durante a execução do disparo')
    } finally {
      setExecutingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Disparo de Promoções (API Meta WhatsApp)
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Envie mensagens de marketing e promoções em massa utilizando **Templates Oficiais pré-aprovados** na Meta.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setShowNewTemplateModal(true)}
            variant="outline"
            className="gap-2"
          >
            <FileCode className="h-4 w-4" />
            Cadastrar Template Meta
          </Button>

          <Button
            onClick={() => setShowNewBroadcastModal(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="h-4 w-4" />
            Novo Disparo em Massa
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === 'broadcasts'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
          }`}
        >
          Disparos Realizados ({broadcasts.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            activeTab === 'templates'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
          }`}
        >
          Templates Meta Aprovados ({templates.length})
        </button>
      </div>

      {/* ABA 1: DISPAROS */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-4">
          {broadcasts.length === 0 ? (
            <Card className="p-8 text-center">
              <Megaphone className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">Nenhum disparo de promoção ainda</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
                Crie o seu primeiro disparo selecionando um template oficial da Meta e filtrando o seu público-alvo.
              </p>
              <Button
                onClick={() => setShowNewBroadcastModal(true)}
                className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" /> Criar Primeiro Disparo
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {broadcasts.map((b) => (
                <Card key={b.id} className="relative flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-xs">
                        {b.template?.name} ({b.template?.language})
                      </Badge>
                      <Badge
                        className={
                          b.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : b.status === 'SENDING'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }
                      >
                        {b.status === 'COMPLETED'
                          ? 'Concluído'
                          : b.status === 'SENDING'
                          ? 'Disparando...'
                          : 'Pendente'}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2">{b.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {b.template?.bodyText}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="flex justify-between border-t pt-2 border-neutral-100 dark:border-neutral-800">
                      <span className="text-neutral-500">Destinatários elegíveis:</span>
                      <span className="font-semibold">{b.totalRecipients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Mensagens enviadas:</span>
                      <span className="font-semibold text-emerald-600">{b.totalSent}</span>
                    </div>

                    {b.status === 'PENDING' && (
                      <Button
                        onClick={() => handleExecuteBroadcast(b.id)}
                        disabled={executingId === b.id}
                        size="sm"
                        className="w-full mt-2 gap-2 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {executingId === b.id ? 'Executando Disparo...' : 'Disparar Agora'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: TEMPLATES META */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <Card className="p-8 text-center">
              <FileCode className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">Nenhum Template Meta cadastrado</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
                Cadastre o nome dos modelos de mensagem que foram aprovados no seu Gerenciador de Negócios da Meta.
              </p>
              <Button
                onClick={() => setShowNewTemplateModal(true)}
                variant="outline"
                className="mt-4 gap-2"
              >
                <Plus className="h-4 w-4" /> Cadastrar Template
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-500 text-white">{t.category}</Badge>
                      <span className="text-xs text-neutral-400 font-mono">{t.language}</span>
                    </div>
                    <CardTitle className="text-base font-mono mt-2 text-emerald-700 dark:text-emerald-400">
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 font-sans whitespace-pre-wrap">
                      {t.bodyText}
                    </div>
                    {t.variablesCount > 0 && (
                      <p className="text-[11px] text-neutral-500">
                        Possui <strong>{t.variablesCount}</strong> variável(is) configurável(is).
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NOVO TEMPLATE META */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <FileCode className="h-5 w-5 text-emerald-600" />
              Cadastrar Template Meta Aprovado
            </h3>
            <p className="text-xs text-neutral-500">
              Digite o nome exato do modelo de mensagem aprovado no seu Meta Business Manager (ex: <code>promocao_outubro_v1</code>).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Nome do Template no Meta</label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="ex: promocao_black_friday"
                  className="font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium mb-1">Idioma</label>
                  <Input
                    value={templateLang}
                    onChange={(e) => setTemplateLang(e.target.value)}
                    placeholder="pt_BR"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Categoria Meta</label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-white p-2 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <option value="MARKETING">MARKETING</option>
                    <option value="UTILITY">UTILITY (Utilidade)</option>
                    <option value="AUTHENTICATION">AUTHENTICATION (Autenticação)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Texto do Corpo (Body Text)</label>
                <Textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="Olá {{1}}, aproveite nossa oferta exclusiva de {{2}}% de desconto!"
                  rows={4}
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Use <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code> para adicionar variáveis dinâmicas.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setShowNewTemplateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {savingTemplate ? 'Salbrando...' : 'Salvar Template'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO DISPARO */}
      {showNewBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900 space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-600" />
              Novo Disparo de Promoção em Massa
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Título da Campanha (Interno)</label>
                <Input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="ex: Promoção de Primavera - Alunos"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Selecione o Template Meta</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    setSelectedTemplateId(e.target.value)
                    setVariableMapping({})
                  }}
                  className="w-full rounded-lg border border-neutral-200 bg-white p-2 text-xs dark:border-neutral-700 dark:bg-neutral-900 font-mono"
                >
                  <option value="">-- Escolha um Template aprovado --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.language}) - {t.variablesCount} variável(is)
                    </option>
                  ))}
                </select>
              </div>

              {/* Mapeamento de Variáveis */}
              {selectedTemplate && selectedTemplate.variablesCount > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200 block">
                    Mapeamento das Variáveis do Template Meta:
                  </span>
                  {Array.from({ length: selectedTemplate.variablesCount }).map((_, idx) => {
                    const varNum = String(idx + 1)
                    return (
                      <div key={varNum} className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-700 min-w-[50px]">
                          {"{{"}{varNum}{"}}"}:
                        </span>
                        <select
                          value={variableMapping[varNum] || 'name'}
                          onChange={(e) =>
                            setVariableMapping((prev) => ({ ...prev, [varNum]: e.target.value }))
                          }
                          className="flex-1 rounded-md border border-neutral-200 bg-white p-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                        >
                          <option value="name">Nome do Lead</option>
                          <option value="phone">Telefone do Lead</option>
                          <option value="status">Status no CRM</option>
                          <option value="PROMO20">Texto Fixo (Cupom: PROMO20)</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Filtro de Público */}
              <div className="rounded-xl border border-neutral-200 p-3 space-y-2 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/50">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Segmentar Público-Alvo:
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Tipo de Lead</label>
                    <select
                      value={filterLeadTypeId}
                      onChange={(e) => setFilterLeadTypeId(e.target.value)}
                      className="w-full rounded-md border border-neutral-200 bg-white p-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <option value="">Todos os tipos</option>
                      {leadTypesOptions.map((lt) => (
                        <option key={lt.id} value={lt.id}>
                          {lt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Período</label>
                    <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                      className="w-full rounded-md border border-neutral-200 bg-white p-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <option value="">Qualquer data</option>
                      <option value="today">Hoje</option>
                      <option value="week">Últimos 7 dias</option>
                      <option value="month">Este Mês</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 mb-0.5">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-md border border-neutral-200 bg-white p-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <option value="">Todos os status</option>
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowNewBroadcastModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => handleCreateBroadcast(true)}
                disabled={creatingBroadcast}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Send className="h-4 w-4" />
                {creatingBroadcast ? 'Criando...' : 'Criar e Disparar Agora'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
