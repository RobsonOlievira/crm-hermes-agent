export interface ServiceItem {
  id: string
  description: string
  quantity?: number
  price: number
}

export interface ProposalData {
  companyName: string
  companyLogo?: string | null
  companyColor?: string | null

  recipientType?: 'client' | 'lead' | 'custom'
  clientId?: string | null
  leadId?: string | null
  clientName: string
  clientEmail?: string | null
  clientPhone?: string | null

  catalogItemId?: string | null
  serviceTitle: string
  serviceType?: string | null

  serviceItems: ServiceItem[]

  subtotal?: number
  discount?: number
  finalPrice: number

  paymentTerms?: string | null
  observations: string
  validUntil?: string | null
}

export interface Template {
  id: string
  name: string
  data: ProposalData
}

export const INITIAL_DATA: ProposalData = {
  companyName: 'Minha Empresa',
  companyLogo: null,
  companyColor: '#8b5cf6',

  recipientType: 'custom',
  clientId: null,
  leadId: null,
  clientName: 'Cliente Exemplo',
  clientEmail: '',
  clientPhone: '',

  catalogItemId: null,
  serviceTitle: 'Prestação de Serviços Profissionais',
  serviceType: 'Geral',

  serviceItems: [
    { id: '1', description: 'Serviço / Entregável principal', quantity: 1, price: 1500 },
    { id: '2', description: 'Suporte e Acompanhamento', quantity: 1, price: 500 },
  ],

  subtotal: 2000,
  discount: 0,
  finalPrice: 2000,

  paymentTerms: '50% de entrada no aceite e 50% na entrega final (ou parcelado em até 3x).',
  observations: '* Válido por 15 dias a contar da data de emissão.\n* O início dos serviços ocorrerá após aprovação deste orçamento.',
  validUntil: '',
}
