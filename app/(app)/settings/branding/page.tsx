'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/layout/page-heading'
import { BrandMark } from '@/components/brand-mark'
import { useBranding } from '@/components/providers/branding-provider'
import { useViewRole } from '@/components/providers/view-role-provider'
import { toast } from 'sonner'
import { Upload, Check, ShieldAlert, Palette, Loader2, RotateCcw } from 'lucide-react'

const PRESET_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#6366F1']

export default function BrandingSettingsPage() {
  const { branding, setBranding, saveBranding, saving } = useBranding()
  const { can } = useViewRole()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!can('settings:branding')) {
    return (
      <div>
        <PageHeading title="Marca (Branding)" description="Personalize a aparência do seu CRM." />
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Acesso restrito</p>
          <p className="max-w-sm text-sm text-muted-foreground">Apenas administradores podem alterar a identidade visual. Altere o perfil de visualização para Administrador no menu superior.</p>
        </Card>
      </div>
    )
  }

  const handleUpload = async (file: File) => {
    if (!file) return
    setUploading(true)
    try {
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      })
      const { uploadUrl, publicUrl } = await res.json()
      if (!uploadUrl) throw new Error('sem url')
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      setBranding({ logoUrl: publicUrl })
      await saveBranding({ logoUrl: publicUrl })
      toast.success('Logo atualizado com sucesso!')
    } catch (e) {
      toast.error('Não foi possível enviar o logo.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    await saveBranding({
      tenantName: branding.tenantName,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      logoUrl: branding.logoUrl,
    })
    toast.success('Identidade visual salva!')
  }

  return (
    <div>
      <PageHeading
        title="Marca (Branding)"
        description="Deixe o CRM com a cara da sua empresa. As alterações são aplicadas em tempo real para você visualizar."
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar alterações
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Identidade</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tenantName">Nome da empresa</Label>
                <Input
                  id="tenantName"
                  value={branding.tenantName}
                  onChange={(e) => setBranding({ tenantName: e.target.value })}
                  className="mt-1.5"
                  placeholder="Nome exibido no CRM"
                />
              </div>
              <div>
                <Label>Logo</Label>
                <div className="mt-1.5 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {branding.logoUrl ? (
                      <div className="relative h-16 w-16">
                        <Image src={branding.logoUrl} alt="Logo" fill className="object-contain" />
                      </div>
                    ) : (
                      <Palette className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUpload(f)
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploading ? 'Enviando...' : 'Enviar logo'}
                    </Button>
                    {branding.logoUrl && (
                      <Button variant="ghost" size="sm" onClick={() => setBranding({ logoUrl: null })} className="ml-2 gap-1.5 text-muted-foreground">
                        <RotateCcw className="h-3.5 w-3.5" /> Remover
                      </Button>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">PNG ou SVG, fundo transparente recomendado.</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Cores da marca</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <ColorField
                label="Cor primária"
                value={branding.primaryColor}
                onChange={(v) => setBranding({ primaryColor: v })}
              />
              <ColorField
                label="Cor secundária"
                value={branding.secondaryColor}
                onChange={(v) => setBranding({ secondaryColor: v })}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">Pré-visualização</h3>
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4">
                <BrandMark />
              </div>
              <div className="space-y-2">
                <div className="w-full rounded-md py-2 text-center text-sm font-medium text-white" style={{ backgroundColor: branding.primaryColor }}>Botão primário</div>
                <div className="w-full rounded-md border py-2 text-center text-sm font-medium" style={{ borderColor: branding.primaryColor, color: branding.primaryColor }}>Botão secundário</div>
                <div className="flex gap-2">
                  <span className="flex-1 rounded-lg py-2 text-center text-xs font-medium text-white" style={{ backgroundColor: branding.primaryColor }}>
                    Primária
                  </span>
                  <span className="flex-1 rounded-lg py-2 text-center text-xs font-medium text-white" style={{ backgroundColor: branding.secondaryColor }}>
                    Secundária
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex items-center gap-2">
        <label className="relative h-10 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border">
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0" style={{ transform: 'scale(2)' }} />
        </label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="h-6 w-6 rounded-full ring-offset-2 transition-transform hover:scale-110"
            style={{ backgroundColor: c, boxShadow: value?.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${c}` : undefined }}
            aria-label={`Selecionar cor ${c}`}
          />
        ))}
      </div>
    </div>
  )
}
