'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/layout/page-heading'
import { useViewRole } from '@/components/providers/view-role-provider'
import { toast } from 'sonner'
import { Check, ShieldAlert, Loader2 } from 'lucide-react'

export default function CompanySettingsPage() {
  const { can } = useViewRole()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<any>({
    legalName: '',
    companyCnpj: '',
    companyEmail: '',
    companyPhone: '',
    addressStreet: '',
    addressComplement: '',
    addressDistrict: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    legalRepName: '',
    legalRepCpf: '',
    legalRepRole: '',
  })

  useEffect(() => {
    fetch('/api/settings/company')
      .then(res => res.json())
      .then(res => {
        if (res.tenant) {
          setData((prev: any) => ({ ...prev, ...res.tenant }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (!can('settings:branding')) {
    return (
      <div>
        <PageHeading title="Dados da Empresa" description="Configurações jurídicas para emissão de contratos." />
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Acesso restrito</p>
          <p className="max-w-sm text-sm text-muted-foreground">Apenas administradores podem alterar os dados jurídicos.</p>
        </Card>
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success('Dados salvos com sucesso!')
    } catch (e) {
      toast.error('Não foi possível salvar os dados.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div>
      <PageHeading
        title="Dados da Empresa"
        description="Informações jurídicas utilizadas para preenchimento automático de contratos."
        actions={
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Salvar dados
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold border-b pb-2">Informações Cadastrais</h3>
          <div>
            <Label>Razão Social</Label>
            <Input value={data.legalName || ''} onChange={e => setData({...data, legalName: e.target.value})} className="mt-1.5" />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={data.companyCnpj || ''} onChange={e => setData({...data, companyCnpj: e.target.value})} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={data.companyEmail || ''} onChange={e => setData({...data, companyEmail: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={data.companyPhone || ''} onChange={e => setData({...data, companyPhone: e.target.value})} className="mt-1.5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold border-b pb-2">Representante Legal (Quem assina)</h3>
          <div>
            <Label>Nome do Representante</Label>
            <Input value={data.legalRepName || ''} onChange={e => setData({...data, legalRepName: e.target.value})} className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>CPF</Label>
              <Input value={data.legalRepCpf || ''} onChange={e => setData({...data, legalRepCpf: e.target.value})} className="mt-1.5" />
            </div>
            <div>
              <Label>Cargo (ex: Sócio-Administrador)</Label>
              <Input value={data.legalRepRole || ''} onChange={e => setData({...data, legalRepRole: e.target.value})} className="mt-1.5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4 lg:col-span-2">
          <h3 className="text-sm font-semibold border-b pb-2">Endereço</h3>
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-4">
              <Label>Rua / Avenida</Label>
              <Input value={data.addressStreet || ''} onChange={e => setData({...data, addressStreet: e.target.value})} className="mt-1.5" />
            </div>
            <div className="col-span-2">
              <Label>Número / Complemento</Label>
              <Input value={data.addressComplement || ''} onChange={e => setData({...data, addressComplement: e.target.value})} className="mt-1.5" />
            </div>
            <div className="col-span-2">
              <Label>Bairro</Label>
              <Input value={data.addressDistrict || ''} onChange={e => setData({...data, addressDistrict: e.target.value})} className="mt-1.5" />
            </div>
            <div className="col-span-2">
              <Label>Cidade</Label>
              <Input value={data.addressCity || ''} onChange={e => setData({...data, addressCity: e.target.value})} className="mt-1.5" />
            </div>
            <div className="col-span-1">
              <Label>Estado (UF)</Label>
              <Input value={data.addressState || ''} onChange={e => setData({...data, addressState: e.target.value})} className="mt-1.5" />
            </div>
            <div className="col-span-1">
              <Label>CEP</Label>
              <Input value={data.addressZip || ''} onChange={e => setData({...data, addressZip: e.target.value})} className="mt-1.5" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
