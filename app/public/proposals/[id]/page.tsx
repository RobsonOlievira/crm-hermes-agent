import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'
import { Card } from '@/components/ui/card'
import { ProposalData } from '@/lib/proposal-types'
import { PublicProposalView } from './public-proposal-view'

export default async function PublicProposalPage({ params }: { params: { id: string } }) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      lead: true,
      tenant: true,
    },
  })

  if (!proposal) notFound()

  let parsedData: ProposalData | null = null
  try {
    parsedData = typeof proposal.data === 'string' ? JSON.parse(proposal.data) : proposal.data
  } catch (e) {
    parsedData = null
  }

  const primaryColor = proposal.tenant?.primaryColor || '#8b5cf6'
  const companyName = proposal.tenant?.legalName || proposal.tenant?.name || 'Empresa'
  const logoUrl = proposal.tenant?.logoUrl

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-8 md:py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Branding Header */}
        <header className="flex flex-col items-center justify-center space-y-3 text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-12 object-contain max-w-[200px]" />
          ) : (
            <BrandMark />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{proposal.title || 'Proposta de Orçamento'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerado por {companyName}</p>
          </div>
        </header>

        {/* Dynamic Interactive Proposal View */}
        <PublicProposalView
          proposalId={proposal.id}
          status={proposal.status}
          data={parsedData}
          companyName={companyName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          clientName={proposal.client?.name || proposal.lead?.name || parsedData?.clientName || 'Cliente'}
          createdAt={proposal.createdAt.toISOString()}
        />
      </div>
    </div>
  )
}
