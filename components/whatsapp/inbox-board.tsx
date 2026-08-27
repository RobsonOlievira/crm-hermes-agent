'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Send,
  Bot,
  User as UserIcon,
  Phone,
  Mail,
  Building2,
  Target,
  Tag,
  DollarSign,
  Wallet,
  Star,
  CalendarClock,
  MessageSquare,
  ExternalLink,
  Info,
  X,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  FileText,
  Video,
  MapPin,
  ChevronLeft,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { initials, formatCurrency } from '@/lib/format'
import { LEAD_STATUS_META, LEAD_SOURCE_META } from '@/lib/crm-constants'
import { toast } from 'sonner'

// ---------- Tipos ----------
export interface ConversationRow {
  leadId: string
  name: string
  phone: string | null
  status: string
  leadTypeLabel: string | null
  leadTypeColor: string | null
  assignedToName: string | null
  lastMessageText: string | null
  lastMessageAt: string | null
  unreadCount: number
  isArchived: boolean
}

interface MessageRow {
  id: string
  direction: string
  content: string
  status: string
  senderName: string | null
  isFromBot: boolean
  mediaUrl: string | null
  mediaType: string | null
  timestamp: string
}

interface LeadDetail {
  id: string
  name: string
  phone: string | null
  email: string | null
  companyName: string | null
  status: string
  source: string | null
  score: number | null
  tags: string[]
  dealValue: number | null
  totalPurchased: number | null
  objective: string | null
  leadTypeLabel: string | null
  leadTypeColor: string | null
  assignedToName: string | null
  firstContactAt: string | null
  messageCount: number
}

interface Props {
  initialConversations: ConversationRow[]
  currentUserName: string
  webhookConfigured: boolean
}

// ---------- Helpers ----------
function statusMeta(status: string) {
  return LEAD_STATUS_META[status] ?? { label: status, color: '#6B7280', bg: 'bg-gray-100', text: 'text-gray-600' }
}

function mediaIcon(type: string | null) {
  switch (type) {
    case 'image':
      return ImageIcon
    case 'audio':
      return Mic
    case 'video':
      return Video
    case 'document':
      return FileText
    case 'location':
      return MapPin
    default:
      return FileText
  }
}

function timeLabel(iso: string | null, mounted: boolean) {
  if (!iso || !mounted) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (isYesterday) return 'Ontem'
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function bubbleTime(iso: string, mounted: boolean) {
  if (!mounted) return ''
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dayDivider(iso: string, mounted: boolean) {
  if (!mounted) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Hoje'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function InboxBoard({ initialConversations, currentUserName, webhookConfigured }: Props) {
  const [mounted, setMounted] = useState(false)
  const [conversations, setConversations] = useState<ConversationRow[]>(initialConversations)
  const [tab, setTab] = useState<'todas' | 'nao_lidas'>('todas')
  const [search, setSearch] = useState('')
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [activeLead, setActiveLead] = useState<LeadDetail | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showBanner, setShowBanner] = useState(true)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setMounted(true), [])

  // -------- Carregar lista de conversas --------
  const loadConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/conversations?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations ?? [])
    } catch {
      /* silencioso — polling */
    }
  }, [search])

  // Recarrega quando a busca muda (com debounce leve)
  useEffect(() => {
    const t = setTimeout(loadConversations, 300)
    return () => clearTimeout(t)
  }, [loadConversations])

  // Polling da lista (~12s)
  useEffect(() => {
    const id = setInterval(loadConversations, 12000)
    return () => clearInterval(id)
  }, [loadConversations])

  // -------- Carregar thread ativa --------
  const loadThread = useCallback(
    async (leadId: string, silent = false) => {
      if (!silent) setLoadingThread(true)
      try {
        const res = await fetch(`/api/conversations/${leadId}/messages`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setMessages(data.messages ?? [])
        setActiveLead(data.lead ?? null)
      } catch {
        /* silencioso */
      } finally {
        if (!silent) setLoadingThread(false)
      }
    },
    [],
  )

  // Polling da thread ativa (~8s)
  useEffect(() => {
    if (!activeLeadId) return
    const id = setInterval(() => loadThread(activeLeadId, true), 8000)
    return () => clearInterval(id)
  }, [activeLeadId, loadThread])

  // Auto-scroll ao final quando as mensagens mudam
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, activeLeadId])

  const selectConversation = useCallback(
    async (leadId: string) => {
      setActiveLeadId(leadId)
      setShowInfo(false)
      await loadThread(leadId)
      // marca como lida
      setConversations((prev) => prev.map((c) => (c.leadId === leadId ? { ...c, unreadCount: 0 } : c)))
      try {
        await fetch(`/api/conversations/${leadId}/read`, { method: 'PATCH' })
      } catch {
        /* ignore */
      }
    },
    [loadThread],
  )

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    if (!text || !activeLeadId || sending) return
    setSending(true)
    // otimista
    const optimistic: MessageRow = {
      id: `tmp-${Date.now()}`,
      direction: 'OUTBOUND',
      content: text,
      status: 'SENT',
      senderName: currentUserName,
      isFromBot: false,
      mediaUrl: null,
      mediaType: null,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft('')
    try {
      const res = await fetch(`/api/conversations/${activeLeadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao enviar')
      }
      await loadThread(activeLeadId, true)
      await loadConversations()
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível enviar a mensagem')
      // remove a otimista em caso de erro
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setDraft(text)
    } finally {
      setSending(false)
    }
  }, [draft, activeLeadId, sending, currentUserName, loadThread, loadConversations])

  const filtered = useMemo(() => {
    let list = conversations
    if (tab === 'nao_lidas') list = list.filter((c) => c.unreadCount > 0)
    return list
  }, [conversations, tab])

  const totalUnread = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [conversations],
  )

  const activeConversation = conversations.find((c) => c.leadId === activeLeadId) || null

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-3">
      {/* Banner de integração com o bot */}
      {showBanner && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          <Bot className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1">
            <p className="font-medium">Central de Conversas conectada ao seu bot de WhatsApp</p>
            <p className="mt-0.5 text-emerald-800/90 dark:text-emerald-200/80">
              As mensagens que chegam no seu WhatsApp aparecem aqui automaticamente (via integração MCP do Hermes
              Agent). Ao responder por este painel, a mensagem é registrada no histórico do lead e{' '}
              {webhookConfigured ? (
                <span className="font-medium">entregue ao seu bot para envio no WhatsApp real.</span>
              ) : (
                <span className="font-medium">
                  fica pronta para ser entregue pelo bot (configure o webhook de saída em Configurações → Integração IA).
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="rounded-md p-1 text-emerald-700/70 hover:bg-emerald-100 dark:text-emerald-300/70 dark:hover:bg-emerald-900/40"
            aria-label="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[330px_1fr_300px] dark:border-gray-800 dark:bg-gray-950">
        {/* ---------- Coluna 1: lista de conversas ---------- */}
        <aside
          className={cn(
            'flex min-h-0 flex-col border-r border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-900/40',
            activeLeadId ? 'hidden md:flex' : 'flex',
          )}
        >
          <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Conversas</h2>
              {totalUnread > 0 && (
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">{totalUnread} não lidas</Badge>
              )}
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone"
                className="pl-9"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setTab('todas')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  tab === 'todas'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                )}
              >
                Todas
              </button>
              <button
                onClick={() => setTab('nao_lidas')}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  tab === 'nao_lidas'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                )}
              >
                Não lidas {totalUnread > 0 && `(${totalUnread})`}
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                <MessageSquare className="h-8 w-8" />
                <p>{tab === 'nao_lidas' ? 'Nenhuma conversa não lida.' : 'Nenhuma conversa ainda.'}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((c) => {
                  const meta = statusMeta(c.status)
                  const isActive = c.leadId === activeLeadId
                  return (
                    <li key={c.leadId}>
                      <button
                        onClick={() => selectConversation(c.leadId)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white dark:hover:bg-gray-800/60',
                          isActive && 'bg-white dark:bg-gray-800/60',
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-11 w-11">
                            <AvatarFallback className="bg-emerald-100 text-sm font-medium text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                              {initials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900"
                            style={{ backgroundColor: meta.color }}
                            title={meta.label}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                            <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                              {timeLabel(c.lastMessageAt, mounted)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {c.lastMessageText || 'Sem mensagens'}
                            </span>
                            {c.unreadCount > 0 && (
                              <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">
                                {c.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </aside>

        {/* ---------- Coluna 2: thread ---------- */}
        <section
          className={cn(
            'flex min-h-0 flex-col bg-[#efeae2] dark:bg-[#0b141a]',
            activeLeadId ? 'flex' : 'hidden md:flex',
          )}
        >
          {!activeLeadId || !activeLead ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gray-50 px-8 text-center dark:bg-[#0b141a]">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <MessageSquare className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Selecione uma conversa</h3>
              <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
                Escolha um contato à esquerda para ver o histórico completo e responder diretamente pelo painel.
              </p>
            </div>
          ) : (
            <>
              {/* Header da thread */}
              <header className="flex items-center gap-3 border-b border-gray-200 bg-[#f0f2f5] px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                <button
                  onClick={() => setActiveLeadId(null)}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
                  aria-label="Voltar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-emerald-100 text-sm font-medium text-emerald-700">
                    {initials(activeLead.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{activeLead.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{activeLead.phone || 'Sem telefone'}</p>
                </div>
                <Badge variant="secondary" className={cn(statusMeta(activeLead.status).bg, statusMeta(activeLead.status).text, 'border-0')}>
                  {statusMeta(activeLead.status).label}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setShowInfo((s) => !s)}
                  aria-label="Informações do lead"
                >
                  <Info className="h-5 w-5" />
                </Button>
              </header>

              {/* Mensagens */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4 md:px-10"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 25px 25px, rgba(0,0,0,0.015) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(0,0,0,0.015) 2%, transparent 0%)',
                  backgroundSize: '100px 100px',
                }}
              >
                {loadingThread && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">Carregando…</div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma mensagem nesta conversa ainda.
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const outbound = m.direction === 'OUTBOUND'
                    const prev = messages[idx - 1]
                    const showDay =
                      !prev || new Date(prev.timestamp).toDateString() !== new Date(m.timestamp).toDateString()
                    const MediaIco = mediaIcon(m.mediaType)
                    return (
                      <div key={m.id}>
                        {showDay && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm dark:bg-gray-800/80 dark:text-gray-300">
                              {dayDivider(m.timestamp, mounted)}
                            </span>
                          </div>
                        )}
                        <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm',
                              outbound
                                ? 'bg-[#d9fdd3] text-gray-800 dark:bg-emerald-800 dark:text-gray-50'
                                : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-50',
                            )}
                          >
                            {outbound && m.isFromBot && (
                              <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <Bot className="h-3 w-3" /> Hermes Agent
                              </span>
                            )}
                            {outbound && !m.isFromBot && m.senderName && (
                              <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <UserIcon className="h-3 w-3" /> {m.senderName}
                              </span>
                            )}
                            {m.mediaType && (
                              <span className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-300">
                                <MediaIco className="h-3.5 w-3.5" /> {m.mediaType}
                              </span>
                            )}
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                            <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-400 dark:text-gray-300/70">
                              {bubbleTime(m.timestamp, mounted)}
                              {outbound &&
                                (m.status === 'READ' ? (
                                  <CheckCheck className="h-3 w-3 text-sky-500" />
                                ) : m.status === 'DELIVERED' ? (
                                  <CheckCheck className="h-3 w-3" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                ))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Composer */}
              <div className="flex items-end gap-2 border-t border-gray-200 bg-[#f0f2f5] px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Digite uma mensagem…"
                  rows={1}
                  className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!draft.trim() || sending}
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600"
                  aria-label="Enviar"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </section>

        {/* ---------- Coluna 3: painel do lead ---------- */}
        {activeLead && (
          <aside
            className={cn(
              'min-h-0 flex-col overflow-y-auto border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
              // lg+: coluna fixa sempre visível. Abaixo de lg: overlay sobre o card, controlado por showInfo.
              'absolute inset-0 z-10 lg:static lg:z-auto',
              showInfo ? 'flex' : 'hidden lg:flex',
            )}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 lg:hidden">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Informações do lead</span>
              <button onClick={() => setShowInfo(false)} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 border-b border-gray-100 px-4 py-6 text-center dark:border-gray-800">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-emerald-100 text-xl font-semibold text-emerald-700">
                  {initials(activeLead.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{activeLead.name}</h3>
              {activeLead.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{activeLead.phone}</p>}
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                <Badge
                  variant="secondary"
                  className={cn(statusMeta(activeLead.status).bg, statusMeta(activeLead.status).text, 'border-0')}
                >
                  {statusMeta(activeLead.status).label}
                </Badge>
                {activeLead.leadTypeLabel && (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: activeLead.leadTypeColor || '#e5e7eb',
                      color: activeLead.leadTypeColor || '#6b7280',
                    }}
                  >
                    {activeLead.leadTypeLabel}
                  </Badge>
                )}
              </div>
              <Link
                href={`/leads/${activeLead.id}`}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
              >
                Ver perfil completo <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-3 px-4 py-4 text-sm">
              <InfoRow icon={UserIcon} label="Responsável" value={activeLead.assignedToName || 'Não atribuído'} />
              <InfoRow
                icon={Phone}
                label="Origem"
                value={activeLead.source ? LEAD_SOURCE_META[activeLead.source]?.label ?? activeLead.source : '—'}
              />
              <InfoRow
                icon={DollarSign}
                label="Valor do negócio"
                value={activeLead.dealValue ? formatCurrency(activeLead.dealValue) : '—'}
              />
              <InfoRow
                icon={Wallet}
                label="Total gasto"
                value={activeLead.totalPurchased ? formatCurrency(activeLead.totalPurchased) : 'R$ 0,00'}
              />
              <InfoRow
                icon={Star}
                label="Pontuação"
                value={activeLead.score != null ? `${activeLead.score} pts` : '—'}
              />
              <InfoRow
                icon={MessageSquare}
                label="Mensagens"
                value={`${activeLead.messageCount} no histórico`}
              />
              <InfoRow
                icon={CalendarClock}
                label="Primeiro contato"
                value={mounted && activeLead.firstContactAt
                  ? new Date(activeLead.firstContactAt).toLocaleDateString('pt-BR')
                  : '—'}
              />
              {activeLead.email && <InfoRow icon={Mail} label="E-mail" value={activeLead.email} />}
              {activeLead.companyName && <InfoRow icon={Building2} label="Empresa" value={activeLead.companyName} />}
              {activeLead.objective && <InfoRow icon={Target} label="Objetivo" value={activeLead.objective} />}

              {activeLead.tags && activeLead.tags.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                    <Tag className="h-3.5 w-3.5" /> Etiquetas
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeLead.tags.map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="break-words text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
      </div>
    </div>
  )
}
