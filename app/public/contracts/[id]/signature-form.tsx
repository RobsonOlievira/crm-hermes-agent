'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, PenLine } from 'lucide-react'

export function SignatureForm({ contractId, clientName }: { contractId: string, clientName: string }) {
  const router = useRouter()
  const [signing, setSigning] = useState(false)
  const [data, setData] = useState({ signatureName: clientName, documentId: '' })

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.signatureName) {
      toast.error('Informe o seu nome completo')
      return
    }

    setSigning(true)
    try {
      const res = await fetch(`/api/public/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao assinar')
      }
      toast.success('Contrato assinado com sucesso!')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSigning(false)
    }
  }

  return (
    <form onSubmit={handleSign} className="max-w-md mx-auto space-y-4">
      <div>
        <Label className="text-blue-900 dark:text-blue-100">Nome completo (Assinatura)</Label>
        <Input 
          required
          value={data.signatureName} 
          onChange={e => setData({...data, signatureName: e.target.value})}
          className="mt-1.5 bg-white dark:bg-zinc-900"
          placeholder="Seu nome completo"
        />
      </div>
      <div>
        <Label className="text-blue-900 dark:text-blue-100">CPF / CNPJ (Opcional)</Label>
        <Input 
          value={data.documentId} 
          onChange={e => setData({...data, documentId: e.target.value})}
          className="mt-1.5 bg-white dark:bg-zinc-900"
          placeholder="Apenas números"
        />
      </div>
      <Button type="submit" disabled={signing} className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
        {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
        Assinar Documento
      </Button>
    </form>
  )
}
