export interface ProspectLead {
  slug: string
  nome: string
  nicho: string
  cidade: string
  busca?: string
  nota?: number | null
  avaliacoes?: number | null
  email?: string | null
  telefone?: string | null
  whatsapp?: string | null
  siteAntigo?: string | null
  motivo?: string | null
  status?: string
  instagram?: string | null
  igSeguidores?: number | null
  igPosts?: number | null
  igAtivo?: string | null
  score: number
  temperatura: '🔥 Quente' | '⚡ Morno' | '❄️ Frio' | string
  abordagem: string
  dossie?: string
}

export interface ProspectSearchOptions {
  nicho: string
  cidade: string
  quantos?: number
  aisaApiKey?: string | null
  simular?: boolean
}

/**
 * Categorias populares de negócios para referência rápida
 */
export const BUSINESS_NICHES = [
  'Clínicas de Estética',
  'Dentistas & Clínicas Odontológicas',
  'Lojas de Produtos Naturais',
  'Barbearias & Salões de Beleza',
  'Academias & Studio Personal',
  'Advogados & Escritórios de Advocacia',
  'Médicos & Consultórios',
  'Imobiliárias & Corretores de Imóveis',
  'Escritórios de Contabilidade',
  'Restaurantes & Pizzarias',
  'Pet Shops & Clínicas Veterinárias',
  'Oficinas Mecânicas & Autocenter',
  'Escolas & Cursos Livres',
  'Gráficas & Comunicação Visual',
  'Empresas de Limpeza & Terceirização',
]

/**
 * Principais cidades por UF para auxílio no filtro
 */
export const MAJOR_CITIES_BY_UF: Record<string, string[]> = {
  SP: ['São Paulo', 'Campinas', 'Guarulhos', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto'],
  RJ: ['Rio de Janeiro', 'Niterói', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Petrópolis'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'Foz do Iguaçu'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Passo Fundo'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó', 'Itajaí'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Ilhéus'],
  PE: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Sobral'],
  DF: ['Brasília', 'Taguatinga', 'Ceilândia'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis'],
}