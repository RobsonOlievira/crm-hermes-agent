'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Icon } from '@/components/layout/icon'
import { formatCurrency, formatCurrencyShort, initials } from '@/lib/format'
import { LEAD_SOURCE_META } from '@/lib/crm-constants'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  GripVertical, Filter, CalendarDays, Tag, Target, Archive, ArchiveRestore,
  ChevronLeft, ChevronRight, Hand, Inbox,
} from 'lucide-react'

export interface KanbanCard {
  id: string
  name: string
  companyName: string | null
  dealValue: number | null
  status: string
  source: string
  assignedToName: string | null
  assignedToAvatar: string | null
  leadTypeId: string | null
  leadTypeLabel: string | null
  leadTypeColor: string | null
  leadTypeIcon: string | null
  objective: string | null
  totalPurchased: number
  createdAt: string
}

export interface ArchivedCard extends KanbanCard {
  stageId: string | null
  stageName: string | null
  stageColor: string | null
  archivedAt: string | null
}

export interface KanbanColumn {
  id: string
  name: string
  color: string
  cards: KanbanCard[]
}

type Period = 'all' | 'day' | 'month' | 'year'

function inPeriod(iso: string, period: Period): boolean {
  if (period === 'all') return true
  const d = new Date(iso)
  const now = new Date()
  if (period === 'day') return d.toDateString() === now.toDateString()
  if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  if (period === 'year') return d.getFullYear() === now.getFullYear()
  return true
}

function daysAgoLabel(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.max(0, Math.floor(diff / 86400000))
  if (days === 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  return `há ${days} dias`
}

export function KanbanBoard({
  initialColumns,
  initialArchived = [],
}: {
  initialColumns: KanbanColumn[]
  initialArchived?: ArchivedCard[]
}) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns ?? [])
  const [archived, setArchived] = useState<ArchivedCard[]>(initialArchived ?? [])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [period, setPeriod] = useState<Period>('all')
  const [leadTypeId, setLeadTypeId] = useState<string>('all')
  const [objective, setObjective] = useState<string>('all')

  // ----- Scroll horizontal: barra superior sincronizada, setas e pan estilo "mão" -----
  const scrollRef = useRef<HTMLDivElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setScrollWidth(el.scrollWidth)
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => updateScrollState())
    ro.observe(el)
    window.addEventListener('resize', updateScrollState)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState, columns])

  const onBoardScroll = () => {
    updateScrollState()
    if (syncing.current) { syncing.current = false; return }
    if (topBarRef.current && scrollRef.current) {
      syncing.current = true
      topBarRef.current.scrollLeft = scrollRef.current.scrollLeft
    }
  }
  const onTopScroll = () => {
    if (syncing.current) { syncing.current = false; return }
    if (topBarRef.current && scrollRef.current) {
      syncing.current = true
      scrollRef.current.scrollLeft = topBarRef.current.scrollLeft
    }
  }

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 340, behavior: 'smooth' })
  }

  // Pan estilo "mão": clicar e arrastar o fundo do board (ignora os cards, que têm drag próprio)
  const pan = useRef<{ active: boolean; startX: number; startScroll: number }>({ active: false, startX: 0, startScroll: 0 })
  const [grabbing, setGrabbing] = useState(false)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('[data-kanban-card]')) return // deixa o drag do card funcionar
    const el = scrollRef.current
    if (!el) return
    pan.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft }
    setGrabbing(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pan.current.active) return
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = pan.current.startScroll - (e.clientX - pan.current.startX)
  }
  const endPan = () => {
    if (pan.current.active) {
      pan.current.active = false
      setGrabbing(false)
    }
  }

  const allCards = useMemo(() => (columns ?? []).flatMap((c) => c.cards ?? []), [columns])

  const leadTypeOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of allCards) {
      if (c.leadTypeId && c.leadTypeLabel) map.set(c.leadTypeId, c.leadTypeLabel)
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [allCards])

  const objectiveOptions = useMemo(() => {
    const set = new Set<string>()
    for (const c of allCards) {
      if (c.objective) set.add(c.objective)
    }
    return Array.from(set)
  }, [allCards])

  const matches = useCallback(
    (c: KanbanCard) =>
      inPeriod(c.createdAt, period) &&
      (leadTypeId === 'all' || c.leadTypeId === leadTypeId) &&
      (objective === 'all' || c.objective === objective),
    [period, leadTypeId, objective]
  )

  const hasActiveFilter = period !== 'all' || leadTypeId !== 'all' || objective !== 'all'

  const moveCard = useCallback(async (cardId: string, toColumnId: string) => {
    let moved: KanbanCard | undefined
    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, cards: [...col.cards] }))
      let fromCol: KanbanColumn | undefined
      for (const col of next) {
        const idx = col.cards.findIndex((c) => c.id === cardId)
        if (idx !== -1) {
          fromCol = col
          moved = col.cards[idx]
          col.cards.splice(idx, 1)
          break
        }
      }
      if (!moved || fromCol?.id === toColumnId) return prev
      const target = next.find((c) => c.id === toColumnId)
      if (target && moved) target.cards.unshift(moved)
      return next
    })
    if (moved) {
      try {
        await fetch(`/api/leads/${cardId}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stageId: toColumnId }),
        })
      } catch (e) {
        // silent in demo
      }
    }
  }, [])

  // Dissolver: enviar conversa para o banco de conversas em off
  const archiveCard = useCallback(async (card: KanbanCard, col: KanbanColumn) => {
    setBusyId(card.id)
    setColumns((prev) => prev.map((c) => (c.id === col.id ? { ...c, cards: c.cards.filter((x) => x.id !== card.id) } : c)))
    setArchived((prev) => [
      { ...card, stageId: col.id, stageName: col.name, stageColor: col.color, archivedAt: new Date().toISOString() },
      ...prev,
    ])
    try {
      const res = await fetch(`/api/leads/${card.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })
      if (!res.ok) throw new Error()
      toast.success('Conversa enviada para o banco de conversas em off.')
    } catch {
      toast.error('Não foi possível dissolver a conversa.')
    } finally {
      setBusyId(null)
    }
  }, [])

  // Restaurar: trazer a conversa de volta ao pipeline (na etapa de origem)
  const restoreCard = useCallback(async (card: ArchivedCard) => {
    setBusyId(card.id)
    setArchived((prev) => prev.filter((x) => x.id !== card.id))
    setColumns((prev) => {
      const targetId = prev.find((c) => c.id === card.stageId)?.id ?? prev[0]?.id
      const { stageId, stageName, stageColor, archivedAt, ...base } = card
      return prev.map((c) => (c.id === targetId ? { ...c, cards: [base as KanbanCard, ...c.cards] } : c))
    })
    try {
      const res = await fetch(`/api/leads/${card.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      })
      if (!res.ok) throw new Error()
      toast.success('Conversa restaurada ao pipeline.')
    } catch {
      toast.error('Não foi possível restaurar a conversa.')
    } finally {
      setBusyId(null)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, colId: string) => {
      e.preventDefault()
      const cardId = e.dataTransfer.getData('text/plain') || draggingId
      if (cardId) moveCard(cardId, colId)
      setDraggingId(null)
      setOverColumn(null)
    },
    [draggingId, moveCard]
  )

  const showScrollTools = canLeft || canRight || scrollWidth > 0

  return (
    <div>
      {/* Barra de filtros no topo do pipeline */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="day">Hoje</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Select value={leadTypeId} onValueChange={setLeadTypeId}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Tipo de lead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {leadTypeOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-muted-foreground" />
          <Select value={objective} onValueChange={setObjective}>
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os objetivos</SelectItem>
              {objectiveOptions.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setPeriod('all')
              setLeadTypeId('all')
              setObjective('all')
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Limpar filtros
          </button>
        )}

        {/* Banco de conversas em off — ao lado dos filtros */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
            >
              <Inbox className="h-4 w-4 text-muted-foreground" />
              Conversas em off
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {archived.length}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent className="flex w-full flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" /> Banco de conversas em off
              </SheetTitle>
              <SheetDescription>
                Conversas que esfriaram (ficaram dias sem resposta) saem do pipeline e ficam guardadas aqui.
                Se o cliente responder, restaure a conversa para o pipeline.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
              {archived.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-semibold">Nenhuma conversa em off</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Use o ícone de arquivar em um card para dissolver uma conversa que esfriou.
                  </p>
                </div>
              ) : (
                archived.map((card) => (
                  <div key={card.id} className="rounded-lg border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight">{card.name}</p>
                        {card.companyName && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.companyName}</p>
                        )}
                      </div>
                      <Avatar className="h-6 w-6">
                        {card.assignedToAvatar && <AvatarImage src={card.assignedToAvatar} alt={card.assignedToName ?? ''} />}
                        <AvatarFallback className="text-[10px]">{initials(card.assignedToName)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {card.leadTypeLabel && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ backgroundColor: `${card.leadTypeColor ?? '#6B7280'}1a`, color: card.leadTypeColor ?? '#6B7280' }}
                        >
                          {card.leadTypeIcon && <Icon name={card.leadTypeIcon} className="h-3 w-3" />}
                          {card.leadTypeLabel}
                        </span>
                      )}
                      {card.stageName && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: `${card.stageColor ?? '#6B7280'}1a`, color: card.stageColor ?? '#6B7280' }}
                        >
                          {card.stageName}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Esfriou {daysAgoLabel(card.archivedAt)}</span>
                      <button
                        type="button"
                        disabled={busyId === card.id}
                        onClick={() => restoreCard(card)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" /> Restaurar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Controles de rolagem horizontal: setas + barra superior + pan estilo mão */}
      {showScrollTools && (
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!canLeft}
            aria-label="Rolar para a esquerda"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {/* Barra de rolagem superior sincronizada com o board */}
          <div
            ref={topBarRef}
            onScroll={onTopScroll}
            className="h-3 flex-1 overflow-x-auto rounded-full bg-muted/50"
          >
            <div style={{ width: scrollWidth }} className="h-px" />
          </div>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!canRight}
            aria-label="Rolar para a direita"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-card shadow-sm transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="hidden shrink-0 items-center gap-1 rounded-lg border bg-card px-2 py-1.5 text-[11px] text-muted-foreground shadow-sm sm:inline-flex">
            <Hand className="h-3.5 w-3.5" /> Arraste o fundo para mover
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onBoardScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        className={cn(
          'flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 select-none',
          grabbing ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        {(columns ?? []).map((col) => {
          const visibleCards = (col.cards ?? []).filter(matches)
          const isClosedColumn = col.id === 'stage-5'
          const total = visibleCards.reduce(
            (sum, c) => sum + (isClosedColumn ? c.totalPurchased ?? 0 : c.dealValue ?? 0),
            0
          )
          const isOver = overColumn === col.id
          return (
            <div
              key={col.id}
              className="flex w-[280px] shrink-0 flex-col"
              onDragOver={(e) => {
                e.preventDefault()
                setOverColumn(col.id)
              }}
              onDragLeave={() => setOverColumn((c) => (c === col.id ? null : c))}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="mb-3 flex items-center justify-between rounded-lg bg-card px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
                  <span className="truncate text-sm font-semibold">{col.name}</span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {visibleCards.length}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">{formatCurrencyShort(total)}</span>
              </div>
              <div
                className={cn(
                  'flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl p-2 transition-colors',
                  isOver ? 'bg-primary/5 ring-2 ring-primary/30' : 'bg-muted/40'
                )}
              >
                {visibleCards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    data-kanban-card
                    draggable
                    onDragStart={(e: any) => {
                      setDraggingId(card.id)
                      e.dataTransfer?.setData?.('text/plain', card.id)
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      'group cursor-grab rounded-lg border-l-4 bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
                      draggingId === card.id && 'opacity-50'
                    )}
                    style={{ borderLeftColor: col.color }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-tight">{card.name}</p>
                        {card.companyName && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.companyName}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          title="Dissolver — enviar para o banco de conversas em off"
                          disabled={busyId === card.id}
                          draggable={false}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            archiveCard(card, col)
                          }}
                          className="rounded p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100 disabled:opacity-30"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>

                    {card.leadTypeLabel && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${card.leadTypeColor ?? '#6B7280'}1a`,
                            color: card.leadTypeColor ?? '#6B7280',
                          }}
                        >
                          {card.leadTypeIcon && <Icon name={card.leadTypeIcon} className="h-3 w-3" />}
                          {card.leadTypeLabel}
                        </span>
                      </div>
                    )}
                    {card.objective && (
                      <p className="mt-1.5 line-clamp-1 text-[11px] text-muted-foreground" title={card.objective}>
                        <Target className="mr-1 inline h-3 w-3 align-[-2px]" />
                        {card.objective}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      {isClosedColumn && (card.totalPurchased ?? 0) > 0 ? (
                        <div className="min-w-0">
                          <span className="block text-sm font-bold" style={{ color: col.color }}>
                            {formatCurrency(card.totalPurchased)}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">total em compras</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold" style={{ color: col.color }}>
                          {formatCurrency(card.dealValue)}
                        </span>
                      )}
                      <Avatar className="h-6 w-6">
                        {card.assignedToAvatar && <AvatarImage src={card.assignedToAvatar} alt={card.assignedToName ?? ''} />}
                        <AvatarFallback className="text-[10px]">{initials(card.assignedToName)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="mt-2">
                      <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {LEAD_SOURCE_META[card.source]?.label ?? card.source}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {visibleCards.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/20 py-8 text-center text-xs text-muted-foreground">
                    {hasActiveFilter ? 'Nenhum lead com esses filtros' : 'Solte um card aqui'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
