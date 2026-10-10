import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'

import { ContractContent } from '@/components/contracts/contract-content'

export default async function ContractPDFPage({ params }: { params: { id: string } }) {
  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    include: { tenant: true, signatures: { orderBy: { signedAt: 'asc' } } },
  })

  if (!contract) notFound()

  // Auto-print effect will be handled by a small client component
  return (
    <div className="bg-white min-h-screen text-black print:p-0 p-8 max-w-4xl mx-auto">
      <AutoPrint />
      
      <header className="flex justify-between items-center border-b pb-6 mb-8">
        <div>
          {contract.tenant?.logoUrl ? (
            <img src={contract.tenant.logoUrl} alt="Logo" className="h-12 object-contain" />
          ) : (
            <BrandMark />
          )}
        </div>
        <div className="text-right text-sm">
          <h1 className="font-bold text-lg">{contract.title}</h1>
          <p className="text-gray-500">Documento gerado eletronicamente</p>
          <p className="text-gray-500 text-xs mt-1">Hash: {contract.contentHash?.substring(0, 16) ?? '—'}...</p>
        </div>
      </header>

      <main className="mb-16">
        <ContractContent content={contract.bodyRendered} />
      </main>

      {/* BLOCO DE AUDITORIA DE ASSINATURAS */}
      {contract.signatures.length > 0 && (
        <section className="border-t pt-8 mt-16 print:break-before-auto">
          <h2 className="text-lg font-bold mb-4">Trilha de Auditoria e Assinaturas</h2>
          <div className="space-y-6">
            {contract.signatures.map((sig: any) => (
              <div key={sig.id} className="border border-gray-200 rounded p-4 text-sm break-inside-avoid">
                <div className="flex justify-between border-b pb-2 mb-2">
                  <span className="font-semibold">{sig.role === 'PROVIDER' ? 'Prestador' : 'Contratante'}: {sig.name}</span>
                  <span className="text-gray-500">{new Date(sig.signedAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><strong>Email:</strong> {sig.email || 'Não informado'}</div>
                  <div><strong>Documento:</strong> {sig.documentId || 'Não informado'}</div>
                  <div><strong>IP:</strong> {sig.ipAddress}</div>
                  <div className="col-span-2"><strong>User Agent:</strong> {sig.userAgent}</div>
                  <div className="col-span-2"><strong>Hash de Assinatura:</strong> {sig.id}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center text-xs text-gray-500">
            Este documento possui validade jurídica. O conteúdo e as assinaturas foram registrados e garantidos pelo sistema.
            <br />
            Hash do documento base: {contract.contentHash}
          </div>
        </section>
      )}
    </div>
  )
}

function AutoPrint() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        `,
      }}
    />
  )
}
