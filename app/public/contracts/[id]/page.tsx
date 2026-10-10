import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'
import { Card } from '@/components/ui/card'
import { SignatureForm } from './signature-form'
import { CONTRACT_STATUS_META } from '@/lib/crm-constants'

import { ContractContent } from '@/components/contracts/contract-content'

export default async function PublicContractPage({ params }: { params: { id: string } }) {
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { client: true, tenant: true },
  })

  if (!contract) notFound()

  const isPendingClient = contract.status === 'PENDING_CLIENT'
  const isSigned = contract.status === 'SIGNED'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col items-center justify-center space-y-4 text-center">
          {contract.tenant?.logoUrl ? (
            <img src={contract.tenant.logoUrl} alt="Logo" className="h-12 object-contain" />
          ) : (
            <BrandMark />
          )}
          <div>
            <h1 className="text-2xl font-bold">{contract.title}</h1>
            <p className="text-muted-foreground mt-1">Documento gerado por {contract.tenant?.legalName || contract.tenant?.name || 'Empresa'}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${CONTRACT_STATUS_META[contract.status]?.color || 'bg-gray-100 text-gray-700'}`}>
            {CONTRACT_STATUS_META[contract.status]?.label || contract.status}
          </div>
        </header>

        <Card className="p-8 md:p-12 shadow-xl bg-white dark:bg-zinc-900 border-t-4" style={{ borderTopColor: contract.tenant?.primaryColor || '#3B82F6' }}>
          <ContractContent content={contract.bodyRendered} />
        </Card>

        {isPendingClient && (
          <Card className="p-6 md:p-8 bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">Assinatura Eletrônica</h2>
              <p className="text-blue-700 dark:text-blue-300 mt-1 text-sm">
                Ao assinar digitalmente, você concorda com os termos descritos no documento acima.
                Este processo tem validade jurídica.
              </p>
            </div>
            <SignatureForm contractId={contract.id} clientName={contract.client?.name || ''} />
          </Card>
        )}

        {isSigned && (
          <Card className="p-6 md:p-8 bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900 text-center">
            <h2 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">Contrato Assinado</h2>
            <p className="text-green-700 dark:text-green-300">
              Este documento foi assinado por ambas as partes e possui validade jurídica.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
