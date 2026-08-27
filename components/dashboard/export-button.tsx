'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

export function ExportButton({ rows }: { rows: { etapa: string; total: number }[] }) {
  const handleExport = () => {
    try {
      const header = 'Etapa,Total\n'
      const body = (rows ?? []).map((r) => `"${r.etapa}",${r.total}`).join('\n')
      const csv = header + body
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'dashboard-funil.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Relatório exportado com sucesso!')
    } catch (e) {
      toast.error('Não foi possível exportar o relatório.')
    }
  }
  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
      <Download className="h-4 w-4" /> Exportar
    </Button>
  )
}
