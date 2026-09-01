'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EMAIL_CATEGORIES, EMAIL_CAMPAIGN_STATUS_META } from '@/lib/crm-constants'
import {
  Bold, Italic, Heading2, Heading3, Pilcrow, AlignLeft, Link2, Image as ImageIcon,
  User, AtSign, Plus, Eye, Send, RefreshCw, Trash2, Edit3, ChevronLeft, Search,
  FileText, Users, BarChart3, Mail,
} from 'lucide-react'

/* ─── tipos ─── */
interface Campaign {
  id: string
  name: string
  subject: string
  htmlBody: string
  category: string
  status: string
  segmentType: string
  segmentValue: string | null
  senderName: string | null
  senderEmail: string | null
  scheduledAt: string | null
  sentAt: string | null
  totalRecipients: number
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  totalFailed: number
  createdAt: string
  template?: { id: string; name: string } | null
  createdBy?: { id: string; name: string } | null
  _count?: { recipients: number }
}

interface Template {
  id: string; name: string; subject: string; htmlBody: string; category: string
}

interface LeadOption {
  id: string; name: string; email: string | null; status: string; source: string | null; tags: string[]
}

type ToolbarItem =
  | { kind: 'wrap'; icon: any; label: string; before: string; after: string; placeholder: string }
  | { kind: 'insert'; icon: any; label: string; text: string }
  | { kind: 'link'; icon: any; label: string }
  | { kind: 'image'; icon: any; label: string }

const TOOLBAR: ToolbarItem[] = [
  { kind: 'wrap', icon: Bold, label: 'Negrito', before: '<strong>', after: '</strong>', placeholder: 'texto em negrito' },
  { kind: 'wrap', icon: Italic, label: 'Itálico', before: '<em>', after: '</em>', placeholder: 'texto em itálico' },
  { kind: 'wrap', icon: Heading2, label: 'Título (H2)', before: '<h2>', after: '</h2>', placeholder: 'Título' },
  { kind: 'wrap', icon: Heading3, label: 'Subtítulo (H3)', before: '<h3>', after: '</h3>', placeholder: 'Subtítulo' },
  { kind: 'wrap', icon: Pilcrow, label: 'Parágrafo', before: '<p>', after: '</p>', placeholder: 'Parágrafo' },
  { kind: 'insert', icon: AlignLeft, label: 'Quebra <br/>', text: '<br />' },
  { kind: 'link', icon: Link2, label: 'Link' },
  { kind: 'image', icon: ImageIcon, label: 'Imagem' },
  { kind: 'insert', icon: User, label: '{{primeiro_nome}}', text: '{{primeiro_nome}}' },
  { kind: 'insert', icon: User, label: '{{nome}}', text: '{{nome}}' },
  { kind: 'insert', icon: AtSign, label: '{{email}}', text: '{{email}}' },
]

const SEGMENT_TYPES = [
  { id: 'ALL', label: 'Todos os leads' },
  { id: 'STATUS', label: 'Por status' },
  { id: 'SOURCE', label: 'Por origem' },
  { id: 'LEAD_TYPE', label: 'Por tipo de lead' },
  { id: 'TAG', label: 'Por tag' },
]

type View = 'list' | 'create' | 'detail'

/* ─── componente ─── */
export function EmailMarketingManager({
  initialCampaigns,
  leadStatuses,
  leadSources,
  leadTypes,
  leadTags,
}: {
  initialCampaigns: Campaign[]
  leadStatuses: string[]
  leadSources: string[]
  leadTypes: { id: string; label: string }[]
  leadTags: string[]
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [view, setView] = useState<View>('list')
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Formulário de criação
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [category, setCategory] = useState('broadcast')
  const [segmentType, setSegmentType] = useState('ALL')
  const [segmentValue, setSegmentValue] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Leads para segmentação
  const [segmentLeads, setSegmentLeads] = useState<LeadOption[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pendingCursor = useRef<{ start: number; end: number } | null>(null)

  // Restaura cursor após React atualizar o textarea
  useEffect(() => {
    if (pendingCursor.current && textareaRef.current) {
      textareaRef.current.selectionStart = pendingCursor.current.start
      textareaRef.current.selectionEnd = pendingCursor.current.end
      textareaRef.current.focus()
      pendingCursor.current = null
    }
  }, [htmlBody])

  // Carrega templates quando muda pra view create
  useEffect(() => {
    if (view === 'create') {
      fetch('/api/email-campaigns/templates').then(r => r.json()).then(d => setTemplates(d.templates || []))
    }
  }, [view])

  // Carrega leads quando muda segmento
  useEffect(() => {
    if (view !== 'create') return
    setLoadingLeads(true)
    const params = new URLSearchParams({ segmentType })
    if (segmentValue) params.set('segmentValue', segmentValue)
    fetch(`/api/email-campaigns/leads?${params}`)
      .then(r => r.json())
      .then(d => setSegmentLeads(d.leads || []))
      .finally(() => setLoadingLeads(false))
  }, [view, segmentType, segmentValue])

  // Filtragem das campanhas
  const filtered = useMemo(() => {
    let list = campaigns
    if (statusFilter !== 'ALL') list = list.filter(c => c.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q))
    }
    return list
  }, [campaigns, statusFilter, search])

  const refreshCampaigns = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/email-campaigns')
      const d = await r.json()
      setCampaigns(d.campaigns || [])
    } finally {
      setLoading(false)
    }
  }

  const applyTransform = useCallback((next: string, cursorStart: number, cursorEnd: number) => {
    pendingCursor.current = { start: cursorStart, end: cursorEnd }
    setHtmlBody(next)
  }, [])

  const handleToolbar = (item: ToolbarItem) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = htmlBody
    const sel = value.substring(start, end)

    if (item.kind === 'insert') {
      const next = value.substring(0, start) + item.text + value.substring(end)
      applyTransform(next, start + item.text.length, start + item.text.length)
      return
    }
    if (item.kind === 'wrap') {
      const inner = sel || item.placeholder
      const next = value.substring(0, start) + item.before + inner + item.after + value.substring(end)
      const selStart = start + item.before.length
      applyTransform(next, selStart, selStart + inner.length)
      return
    }
    if (item.kind === 'link') {
      const url = window.prompt('URL do link (https://...)')
      if (!url) return
      const text = sel || window.prompt('Texto do link') || url
      const tag = `<a href="${url}">${text}</a>`
      const next = value.substring(0, start) + tag + value.substring(end)
      applyTransform(next, start + tag.length, start + tag.length)
      return
    }
    if (item.kind === 'image') {
      const url = window.prompt('URL da imagem (https://...)')
      if (!url) return
      const alt = window.prompt('Texto alternativo (alt)') || ''
      const tag = `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;" />`
      const next = value.substring(0, start) + tag + value.substring(end)
      applyTransform(next, start + tag.length, start + tag.length)
      return
    }
  }

  const personalize = (template: string) => {
    return template
      .replace(/\{\{nome\}\}/g, 'João da Silva')
      .replace(/\{\{primeiro_nome\}\}/g, 'João')
      .replace(/\{\{email\}\}/g, 'joao@exemplo.com')
  }

  const loadTemplate = (tpl: Template) => {
    setSubject(tpl.subject)
    setHtmlBody(tpl.htmlBody)
    setCategory(tpl.category || 'broadcast')
    setFeedback({ type: 'success', message: `Template "${tpl.name}" carregado` })
    setTimeout(() => setFeedback(null), 3000)
  }

  const resetForm = () => {
    setName(''); setSubject(''); setHtmlBody(''); setCategory('broadcast')
    setSegmentType('ALL'); setSegmentValue(''); setSenderName(''); setSenderEmail('')
    setShowPreview(false); setFeedback(null)
  }

  const handleSave = async (asDraft = true) => {
    if (!name.trim()) { setFeedback({ type: 'error', message: 'Informe o nome da campanha' }); return }
    if (!subject.trim()) { setFeedback({ type: 'error', message: 'Informe o assunto' }); return }
    setSaving(true)
    setFeedback(null)
    try {
      const r = await fetch('/api/email-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, subject, htmlBody, category, segmentType,
          segmentValue: segmentValue || null,
          senderName: senderName || null,
          senderEmail: senderEmail || null,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setFeedback({ type: 'error', message: d.error || 'Erro ao salvar' }); return }
      setFeedback({ type: 'success', message: 'Campanha salva como rascunho!' })
      await refreshCampaigns()
      setTimeout(() => { resetForm(); setView('list') }, 1500)
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta campanha?')) return
    try {
      const r = await fetch(`/api/email-campaigns/${id}`, { method: 'DELETE' })
      if (r.ok) await refreshCampaigns()
    } catch {}
  }

  const openDetail = async (c: Campaign) => {
    try {
      const r = await fetch(`/api/email-campaigns/${c.id}`)
      const d = await r.json()
      setSelectedCampaign(d.campaign || c)
      setView('detail')
    } catch {
      setSelectedCampaign(c)
      setView('detail')
    }
  }

  const fmtDate = (iso: string) => {
    if (!mounted) return ''
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
  }

  /* ──────── VIEWS ──────── */

  // ─── LISTA ───
  if (view === 'list') {
    return (
      <div className="space-y-4">
        {/* Controles */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar campanhas..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
              <option value="ALL">Todos os status</option>
              {Object.entries(EMAIL_CAMPAIGN_STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={refreshCampaigns} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button size="sm" onClick={() => { resetForm(); setView('create') }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Campanha
            </Button>
          </div>
        </div>

        {/* Tabela */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 p-12 text-center">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
            <Button size="sm" className="mt-4" onClick={() => { resetForm(); setView('create') }}>
              <Plus className="h-4 w-4 mr-1" /> Criar primeira campanha
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 dark:bg-gray-800/50 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campanha</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Destinatários</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Aberturas</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Data</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filtered.map(c => {
                  const sm = EMAIL_CAMPAIGN_STATUS_META[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-600' }
                  const catLabel = EMAIL_CATEGORIES[c.category]?.label || c.category
                  const openRate = c.totalSent > 0 ? Math.round((c.totalOpened / c.totalSent) * 100) : 0
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 dark:hover:bg-gray-800/30 cursor-pointer"
                      onClick={() => openDetail(c)}>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[200px]">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.subject}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{catLabel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sm.color}`}>
                          {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="text-muted-foreground">{c.totalRecipients || c._count?.recipients || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        {c.totalSent > 0 ? (
                          <span className="text-muted-foreground">{openRate}%</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {(c.status === 'DRAFT' || c.status === 'CANCELLED') && (
                            <button onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ─── DETALHE ───
  if (view === 'detail' && selectedCampaign) {
    const c = selectedCampaign
    const sm = EMAIL_CAMPAIGN_STATUS_META[c.status] || { label: c.status, color: 'bg-gray-100 text-gray-600' }
    const catLabel = EMAIL_CATEGORIES[c.category]?.label || c.category
    const openRate = c.totalSent > 0 ? Math.round((c.totalOpened / c.totalSent) * 100) : 0
    const clickRate = c.totalSent > 0 ? Math.round((c.totalClicked / c.totalSent) * 100) : 0
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedCampaign(null); setView('list') }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">{c.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">Assunto: {c.subject}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${sm.color}`}>
            {sm.label}
          </span>
        </div>

        {/* Stats cards */}
        {c.totalSent > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Enviados', value: c.totalSent, icon: Send, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Aberturas', value: `${c.totalOpened} (${openRate}%)`, icon: Eye, color: 'text-green-600 dark:text-green-400' },
              { label: 'Cliques', value: `${c.totalClicked} (${clickRate}%)`, icon: BarChart3, color: 'text-violet-600 dark:text-violet-400' },
              { label: 'Bounces', value: c.totalBounced + c.totalFailed, icon: RefreshCw, color: 'text-red-600 dark:text-red-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-lg font-semibold">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="rounded-xl border p-5 space-y-3 dark:border-gray-700 dark:bg-gray-800/30">
          <h3 className="font-semibold text-sm">Detalhes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <InfoRow label="Categoria" value={catLabel} />
            <InfoRow label="Segmento" value={c.segmentType === 'ALL' ? 'Todos os leads' : `${c.segmentType}: ${c.segmentValue || '—'}`} />
            <InfoRow label="Criado por" value={c.createdBy?.name || '—'} />
            <InfoRow label="Criado em" value={fmtDate(c.createdAt)} />
            {c.sentAt && <InfoRow label="Enviado em" value={fmtDate(c.sentAt)} />}
            {c.scheduledAt && <InfoRow label="Agendado para" value={fmtDate(c.scheduledAt)} />}
            {c.senderName && <InfoRow label="Remetente" value={`${c.senderName}${c.senderEmail ? ` <${c.senderEmail}>` : ''}`} />}
          </div>
        </div>

        {/* Preview HTML */}
        {c.htmlBody && (
          <div className="rounded-xl border dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2 bg-muted/50 dark:bg-gray-800/50 border-b dark:border-gray-700">
              <span className="text-xs font-medium text-muted-foreground">Preview do conteúdo</span>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: c.htmlBody }} />
          </div>
        )}
      </div>
    )
  }

  // ─── CRIAR ───
  return (
    <div className="space-y-6">
      <button onClick={() => setView('list')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      <h2 className="text-xl font-bold">Nova Campanha</h2>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          feedback.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
          : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
        }`}>{feedback.message}</div>
      )}

      {/* Templates rápidos */}
      {templates.length > 0 && (
        <div className="rounded-xl border p-4 dark:border-gray-700 dark:bg-gray-800/30">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" /> Templates disponíveis
          </h3>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <button key={t.id} onClick={() => loadTemplate(t)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted/50 dark:border-gray-600 dark:hover:bg-gray-700/50 transition-colors">
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dados básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Nome da campanha *</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Black Friday 2026" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Assunto do email *</label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Oferta imperdível!" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Categoria</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            {Object.entries(EMAIL_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Segmento</label>
          <select value={segmentType} onChange={e => { setSegmentType(e.target.value); setSegmentValue('') }}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            {SEGMENT_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Valor do segmento */}
      {segmentType !== 'ALL' && (
        <div>
          <label className="text-sm font-medium mb-1 block">
            {segmentType === 'STATUS' ? 'Status' : segmentType === 'SOURCE' ? 'Origem' : segmentType === 'LEAD_TYPE' ? 'Tipo de lead' : 'Tag'}
          </label>
          <select value={segmentValue} onChange={e => setSegmentValue(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 max-w-xs">
            <option value="">Selecione...</option>
            {segmentType === 'STATUS' && leadStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            {segmentType === 'SOURCE' && leadSources.map(s => <option key={s} value={s}>{s}</option>)}
            {segmentType === 'LEAD_TYPE' && leadTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            {segmentType === 'TAG' && leadTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Users className="h-3 w-3" />
            {loadingLeads ? 'Carregando...' : `${segmentLeads.length} leads com email neste segmento`}
          </p>
        </div>
      )}

      {/* Remetente (opcional) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Nome do remetente (opcional)</label>
          <Input value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="Ex: Equipe Vortex" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Email do remetente (opcional)</label>
          <Input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} placeholder="Ex: contato@vortex.com" />
        </div>
      </div>

      {/* Editor HTML */}
      <div className="rounded-xl border dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-1 flex-wrap px-3 py-2 bg-muted/50 dark:bg-gray-800/50 border-b dark:border-gray-700">
          {TOOLBAR.map((item, i) => (
            <button key={i} onClick={() => handleToolbar(item)} title={item.label}
              className="p-1.5 rounded hover:bg-muted dark:hover:bg-gray-700 text-muted-foreground hover:text-foreground transition-colors">
              <item.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <textarea ref={textareaRef} value={htmlBody} onChange={e => setHtmlBody(e.target.value)}
          placeholder="Escreva o HTML do email aqui... Use a toolbar acima para formatar."
          className="w-full min-h-[250px] p-4 bg-background text-sm font-mono resize-y focus:outline-none dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500" />
      </div>

      {/* Preview toggle */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
          <Eye className="h-4 w-4 mr-1" /> {showPreview ? 'Ocultar' : 'Ver'} Preview
        </Button>
        <span className="text-xs text-muted-foreground">Variáveis são substituídas por dados de exemplo</span>
      </div>

      {showPreview && htmlBody.trim() && (
        <div className="rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2 bg-muted/50 dark:bg-gray-800/50 border-b dark:border-gray-700">
            <span className="text-xs font-medium text-muted-foreground">Preview</span>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900 prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: personalize(htmlBody) }} />
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={() => handleSave(true)} disabled={saving}>
          {saving ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Edit3 className="h-4 w-4 mr-1" />}
          Salvar Rascunho
        </Button>
        <Button variant="outline" onClick={() => { resetForm(); setView('list') }}>Cancelar</Button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between sm:justify-start sm:gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
