'use client'

import { useState } from 'react'
import {
  Target,
  Sparkles,
  Building2,
  MapPin,
  Globe,
  Instagram,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Flame,
  Zap,
  Snowflake,
  Copy,
  UserPlus,
  Loader2,
  Info,
  Check,
  Star,
  Key,
  Settings2,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react'
import { ProspectLead, BUSINESS_NICHES } from '@/lib/services/prospecting/aisa-types'
import { toast } from 'sonner'

interface ProspectingManagerProps {
  initialNiche: string
  hasApiKey: boolean
  totalProspectsImported: number
}

export function ProspectingManager({
  initialNiche,
  hasApiKey: initialHasApiKey,
  totalProspectsImported: initialTotalImported,
}: ProspectingManagerProps) {
  const [nicho, setNicho] = useState(initialNiche)
  const [cidade, setCidade] = useState('São Paulo')
  const [quantos, setQuantos] = useState(10)
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey)
  const [simular, setSimular] = useState(!initialHasApiKey)
  const [loading, setLoading] = useState(false)
  const [prospects, setProspects] = useState<ProspectLead[]>([])
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importedTotal, setImportedTotal] = useState(initialTotalImported)

  // Modal de Configuração da Chave AIsa
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [aisaKeyInput, setAisaKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  // Modal de Dossiê
  const [dossierProspect, setDossierProspect] = useState<ProspectLead | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  // Salvar Chave AIsa
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingKey(true)

    try {
      const res = await fetch('/api/prospecting/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aisaApiKey: aisaKeyInput, niche: nicho }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar chave')

      setHasApiKey(data.hasKey)
      setSimular(!data.hasKey)
      toast.success(data.message || 'Configurações salvas com sucesso!')
      setShowSettingsModal(false)
      setAisaKeyInput('')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar chave AIsa.')
    } finally {
      setSavingKey(false)
    }
  }

  // Busca Prospects via API
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!nicho.trim() || !cidade.trim()) {
      toast.error('Informe o Nicho e a Cidade para buscar prospects.')
      return
    }

    setLoading(true)
    setProspects([])
    setSelectedSlugs([])

    try {
      const res = await fetch('/api/prospecting/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho, cidade, quantos, simular }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao prospectar')
      }

      setProspects(data.prospects || [])
      toast.success(`${data.prospects.length} prospects qualificados encontrados!`)
    } catch (err: any) {
      toast.error(err.message || 'Falha na busca de prospects.')
    } finally {
      setLoading(false)
    }
  }

  // Toggle Seleção
  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const toggleSelectAll = () => {
    if (selectedSlugs.length === prospects.length) {
      setSelectedSlugs([])
    } else {
      setSelectedSlugs(prospects.map((p) => p.slug))
    }
  }

  // Importar para o CRM
  const handleImportSelected = async () => {
    const toImport = prospects.filter((p) => selectedSlugs.includes(p.slug))
    if (toImport.length === 0) return

    setImporting(true)
    try {
      const res = await fetch('/api/prospecting/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: toImport }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao importar')

      toast.success(data.message)
      setImportedTotal((prev) => prev + (data.importedCount || 0))
      setSelectedSlugs([])
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar prospects')
    } finally {
      setImporting(false)
    }
  }

  // Copiar Texto de Abordagem
  const handleCopyAbordagem = (text: string, slug: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSlug(slug)
    toast.success('Abordagem personalizada copiada!')
    setTimeout(() => setCopiedSlug(null), 2500)
  }

  // Abertura Direta WhatsApp
  const handleOpenWhatsApp = (p: ProspectLead) => {
    const phone = (p.whatsapp || p.telefone || '').replace(/\D/g, '')
    if (!phone) {
      toast.error('Este prospect não possui WhatsApp cadastrado.')
      return
    }
    const cleanPhone = phone.startsWith('55') ? phone : `55${phone}`
    const text = encodeURIComponent(p.abordagem)
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank')
  }

  return (
    <div className="space-y-8 pb-24">
      {/* HEADER DE MÉTRICAS & CONFIGURAÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Nicho Alvo */}
        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nicho Alvo Atual
              </span>
              <p className="text-lg font-bold text-foreground truncate max-w-[180px]">
                {nicho || 'Defina seu nicho'}
              </p>
            </div>
          </div>
        </div>

        {/* Chave AIsa & Status */}
        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-lg border flex items-center justify-center ${
                hasApiKey
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
              }`}
            >
              <Key className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Chave de API AIsa
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {hasApiKey ? (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Ativa & Conectada
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Modo Simulação
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            title="Configurar Chave AIsa"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* Prospects no CRM */}
        <div className="bg-card text-card-foreground border border-border rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Prospects no CRM
            </span>
            <p className="text-lg font-bold text-foreground">{importedTotal} Outbound</p>
          </div>
        </div>
      </div>

      {/* FORMULÁRIO DE PROSPECÇÃO (DESIGN SYSTEM RESPEITADO) */}
      <div className="bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Configurar Busca de Prospects</h2>
            <p className="text-sm text-muted-foreground">
              Encontre empresas reais no Google Maps com diagnóstico inteligente de oportunidade.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Campo Nicho */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" /> Nicho de Mercado
            </label>
            <input
              type="text"
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              placeholder="Ex: Dentistas, Estética..."
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            {/* Chips rápidos */}
            <div className="flex flex-wrap gap-1 mt-1">
              {BUSINESS_NICHES.slice(0, 3).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNicho(n)}
                  className="text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md transition-colors"
                >
                  {n.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Campo Cidade */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> Cidade / Estado
            </label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: São Paulo, Rio de Janeiro..."
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {['São Paulo', 'Rio de Janeiro', 'Curitiba'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCidade(c)}
                  className="text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-500" /> Leads por Busca
            </label>
            <select
              value={quantos}
              onChange={(e) => setQuantos(Number(e.target.value))}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            >
              <option value={5}>5 prospects</option>
              <option value={10}>10 prospects</option>
              <option value={20}>20 prospects</option>
            </select>
          </div>

          {/* Botão de Busca */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold rounded-xl px-5 py-2.5 text-sm shadow flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Prospecção Ativa...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Buscar Prospects</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RESULTADOS DA BUSCA */}
      {prospects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>Prospects Encontrados</span>
                <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full border border-primary/20">
                  {prospects.length} empresas
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {selectedSlugs.length === prospects.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
          </div>

          {/* GRID DOS CARDS DE PROSPECT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prospects.map((p) => {
              const isSelected = selectedSlugs.includes(p.slug)
              const score = p.score || 75
              const isHot = score >= 85
              const isWarm = score >= 70 && score < 85

              return (
                <div
                  key={p.slug}
                  className={`bg-card text-card-foreground border rounded-2xl p-5 transition-all relative group flex flex-col justify-between shadow-sm ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 shadow-md'
                      : 'border-border hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.slug)}
                          className="mt-1 rounded border-input bg-background text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <h4 className="font-bold text-foreground text-base leading-tight group-hover:text-primary transition-colors">
                            {p.nome}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" /> {p.cidade || cidade} •{' '}
                            <span className="font-medium text-foreground">{p.nicho}</span>
                          </p>
                        </div>
                      </div>

                      {/* Badge de Score / Oportunidade */}
                      <div
                        className={`px-2.5 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 shrink-0 ${
                          isHot
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : isWarm
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                        }`}
                      >
                        {isHot ? (
                          <Flame className="w-3.5 h-3.5 fill-rose-500/20" />
                        ) : isWarm ? (
                          <Zap className="w-3.5 h-3.5" />
                        ) : (
                          <Snowflake className="w-3.5 h-3.5" />
                        )}
                        <span>{score} pts</span>
                      </div>
                    </div>

                    {/* Presença Digital & Avaliações */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-xs bg-muted/50 rounded-xl p-3 border border-border">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">
                          {p.siteAntigo ? (
                            <a
                              href={p.siteAntigo}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              Possui Site <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">Sem Site Próprio ⚠️</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                        <span className="text-foreground truncate">
                          {p.instagram || 'Não informado'}
                          {p.igSeguidores ? ` (${p.igSeguidores} seg)` : ''}
                        </span>
                      </div>

                      {p.nota && (
                        <div className="flex items-center gap-2 col-span-2">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
                          <span className="text-foreground">
                            <strong>{p.nota} ★</strong> ({p.avaliacoes || 0} avaliações no Google)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Diagnóstico da IA / Motivo */}
                    {p.motivo && (
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 text-xs text-foreground flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="line-clamp-2">
                          <strong className="text-primary">Diagnóstico IA:</strong> {p.motivo}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações de Abordagem */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(p)}
                        className="flex-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl py-2 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Abordar via WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDossierProspect(p)}
                        className="bg-muted hover:bg-muted/80 text-foreground rounded-xl p-2 text-xs flex items-center justify-center transition-colors"
                        title="Ver Dossiê Completo"
                      >
                        <Info className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyAbordagem(p.abordagem, p.slug)}
                        className="bg-muted hover:bg-muted/80 text-foreground rounded-xl p-2 text-xs flex items-center justify-center transition-colors"
                        title="Copiar Abordagem IA"
                      >
                        {copiedSlug === p.slug ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ESTADO VAZIO */}
      {prospects.length === 0 && !loading && (
        <div className="bg-card text-card-foreground border border-border rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Inicie sua Prospecção Direcionada</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Selecione o seu nicho de atuação e cidade desejada no painel acima. O motor AIsa trará
            as melhores empresas B2B prontas para receberem sua abordagem de vendas.
          </p>
        </div>
      )}

      {/* BARRA FLUTUANTE DE IMPORTAÇÃO EM LOTE */}
      {selectedSlugs.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-card text-card-foreground border border-primary/40 rounded-2xl p-4 shadow-2xl z-40 flex items-center gap-4 animate-in slide-in-from-bottom duration-300 max-w-lg w-full">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-bold text-foreground">
              {selectedSlugs.length} prospect(s) selecionado(s)
            </span>
          </div>

          <button
            type="button"
            onClick={handleImportSelected}
            disabled={importing}
            className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-all active:scale-95"
          >
            {importing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Importando...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Importar para o CRM</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO DA CHAVE AISA */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-base">Chave de API do AIsa</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Insira a sua chave de API AIsa para ativar a prospecção em tempo real com varredura de sites e presença digital.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Chave de API AIsa</label>
                <input
                  type="password"
                  value={aisaKeyInput}
                  onChange={(e) => setAisaKeyInput(e.target.value)}
                  placeholder="Cole aqui sua chave AIsa..."
                  className="w-full bg-background border border-input rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Nicho Padrão do CRM</label>
                <input
                  type="text"
                  value={nicho}
                  onChange={(e) => setNicho(e.target.value)}
                  placeholder="Ex: Dentistas"
                  className="w-full bg-background border border-input rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingKey}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl shadow flex items-center gap-1.5"
                >
                  {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Salvar Chave</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DOSSIÊ COMPLETO DO PROSPECT */}
      {dossierProspect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="text-xs text-primary font-semibold uppercase tracking-wider">
                  Dossiê de Inteligência Outbound
                </span>
                <h3 className="text-xl font-bold text-foreground mt-1">{dossierProspect.nome}</h3>
                <p className="text-xs text-muted-foreground">
                  {dossierProspect.nicho} • {dossierProspect.cidade}
                </p>
              </div>
              <button
                onClick={() => setDossierProspect(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações de Contato */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-muted/50 p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block mb-1">WhatsApp / Telefone</span>
                <span className="text-foreground font-medium">{dossierProspect.whatsapp || dossierProspect.telefone || 'Não informado'}</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block mb-1">Email</span>
                <span className="text-foreground font-medium">{dossierProspect.email || 'Não informado'}</span>
              </div>
            </div>

            {/* Sugestão de Abordagem IA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Sugestão de Abordagem Personalizada (IA)
                </label>
                <button
                  type="button"
                  onClick={() => handleCopyAbordagem(dossierProspect.abordagem, dossierProspect.slug)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <Copy className="w-3 h-3" /> Copiar Texto
                </button>
              </div>
              <div className="bg-muted/50 border border-border rounded-xl p-4 text-xs text-foreground leading-relaxed font-mono">
                {dossierProspect.abordagem}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleOpenWhatsApp(dossierProspect)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow"
              >
                <MessageSquare className="w-4 h-4" /> Abordar Agora no WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
