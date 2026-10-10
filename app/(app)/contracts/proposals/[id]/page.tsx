'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProposalData, INITIAL_DATA } from '@/lib/proposal-types'
import { ProposalEditor } from '@/components/proposals/proposal-editor'
import { ProposalPreview } from '@/components/proposals/proposal-preview'
import { ZoomIn, ZoomOut, Hand, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function EditProposalPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [data, setData] = useState<ProposalData>(INITIAL_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [scale, setScale] = useState(1)
  const [publicUrl, setPublicUrl] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Pan/Hand Tool State
  const [isHandMode, setIsHandMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPublicUrl(`${window.location.origin}/public/proposals/${params.id}`)
    }
  }, [params.id])

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const res = await fetch(`/api/proposals/${params.id}`)
        if (!res.ok) throw new Error('Não foi possível carregar o orçamento')
        const json = await res.json()

        if (json.proposal?.data) {
          let parsedData = json.proposal.data
          if (typeof parsedData === 'string') {
            parsedData = JSON.parse(parsedData)
          }
          setData({ ...INITIAL_DATA, ...parsedData })
        }
      } catch (e: any) {
        toast.error(e.message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProposal()
  }, [params.id])

  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current) {
        const container = containerRef.current
        const padding = 64
        const availableWidth = container.clientWidth - padding
        const availableHeight = container.clientHeight - padding

        const docWidth = 794
        const docHeight = 1123

        const scaleX = availableWidth / docWidth
        const scaleY = availableHeight / docHeight

        const newScale = Math.min(scaleX, scaleY)
        if (newScale > 0) setScale(newScale)
      }
    }

    if (!isLoading) {
      calculateScale()
      window.addEventListener('resize', calculateScale)
      return () => window.removeEventListener('resize', calculateScale)
    }
  }, [isLoading])

  const loadHtml2Pdf = async () => {
    if (typeof window !== 'undefined' && !(window as any).html2pdf) {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.async = true
      document.body.appendChild(script)
      return new Promise((resolve) => {
        script.onload = resolve
      })
    }
  }

  const handleDownloadPDF = async () => {
    await loadHtml2Pdf()

    if (typeof (window as any).html2pdf === 'undefined') {
      toast.error('A biblioteca de PDF ainda está carregando. Tente novamente em alguns segundos.')
      return
    }

    setIsGenerating(true)
    const element = document.getElementById('proposal-content')

    const opt = {
      margin: 0,
      filename: `Orcamento-${data.clientName.replace(/\s+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        width: 794,
        height: 1123,
      },
      jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait' },
    }

    try {
      await (window as any).html2pdf().set(opt).from(element).save()
      toast.success('PDF gerado com sucesso!')
    } catch (error) {
      console.error('PDF Generation failed', error)
      toast.error('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/proposals/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${data.serviceTitle} — ${data.clientName}`,
          data: data,
        }),
      })

      if (!res.ok) throw new Error('Erro ao salvar')

      toast.success('Orçamento atualizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao atualizar orçamento no banco.')
    } finally {
      setIsSaving(false)
    }
  }

  const adjustZoom = (delta: number) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.2), 3.0))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isHandMode || !containerRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - containerRef.current.offsetLeft)
    setStartY(e.pageY - containerRef.current.offsetTop)
    setScrollLeft(containerRef.current.scrollLeft)
    setScrollTop(containerRef.current.scrollTop)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isHandMode || !containerRef.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const y = e.pageY - containerRef.current.offsetTop
    const walkX = (x - startX) * 1.5
    const walkY = (y - startY) * 1.5
    containerRef.current.scrollLeft = scrollLeft - walkX
    containerRef.current.scrollTop = scrollTop - walkY
  }

  const handleMouseUp = () => setIsDragging(false)
  const handleMouseLeave = () => setIsDragging(false)

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] -m-6 items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        <p className="text-zinc-400 mt-4">Carregando orçamento...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] -m-6 overflow-hidden bg-slate-900 text-white font-['Inter']">
      {/* Navbar Minimal */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-950">
        <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold text-lg">Visualizar / Editar Orçamento</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Editor */}
        <div className="w-[450px] flex-shrink-0 z-50 border-r border-zinc-800 bg-zinc-900">
          <ProposalEditor
            data={data}
            onChange={setData}
            onPrint={handleDownloadPDF}
            onSave={handleSave}
            isSaving={isSaving}
            publicUrl={publicUrl}
          />
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 bg-zinc-950 relative h-full">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          ></div>

          <div
            ref={containerRef}
            className={`absolute inset-0 overflow-auto flex items-center justify-center p-8 custom-scrollbar z-10 ${
              isHandMode
                ? isDragging
                  ? 'cursor-grabbing select-none'
                  : 'cursor-grab select-none'
                : 'cursor-default'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div
              style={{
                width: 794 * scale,
                height: 1123 * scale,
                position: 'relative',
                flexShrink: 0,
                transition: isDragging ? 'none' : 'width 0.1s, height 0.1s',
              }}
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: 794,
                  height: 1123,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  transition: 'transform 0.1s',
                  pointerEvents: isHandMode ? 'none' : 'auto',
                }}
              >
                <ProposalPreview data={data} id="proposal-content" />
              </div>
            </div>
          </div>

          {isGenerating && (
            <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p style={{ color: '#8b5cf6' }} className="animate-pulse">Gerando seu PDF...</p>
            </div>
          )}

          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 p-3 rounded-2xl shadow-2xl z-40">
            <button onClick={() => adjustZoom(0.1)} className="p-2 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 rounded-full transition-all">
              <ZoomIn size={20} />
            </button>

            <div className="h-32 w-8 flex items-center justify-center">
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="appearance-none bg-zinc-700 rounded-full h-1 w-32 -rotate-90 origin-center cursor-pointer accent-purple-500 outline-none"
              />
            </div>

            <button onClick={() => adjustZoom(-0.1)} className="p-2 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 rounded-full transition-all">
              <ZoomOut size={20} />
            </button>

            <div className="w-full h-px bg-zinc-700 my-1"></div>

            <button
              onClick={() => setIsHandMode(!isHandMode)}
              className={`p-2 rounded-full transition-all ${
                isHandMode ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-400 hover:text-purple-400 hover:bg-zinc-800'
              }`}
            >
              <Hand size={20} />
            </button>

            <span className="text-[10px] font-mono text-zinc-500 border-t border-zinc-700 pt-2 w-full text-center">
              {Math.round(scale * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
