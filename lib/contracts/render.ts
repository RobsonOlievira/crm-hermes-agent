import crypto from 'crypto'

export interface ContractRenderData {
  empresa: {
    razao_social: string
    cnpj: string
    endereco: string
    representante: string
    rep_cpf: string
  }
  cliente: {
    nome: string
    empresa: string
    cnpj: string
    telefone: string
    email: string
  }
  contrato: {
    servicos: string
    valor_total: string
    pagamento: string
    data: string
  }
}

export const DEFAULT_CONTRACT_TEMPLATE = `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Por este instrumento particular, as partes abaixo qualificadas celebram o presente **Contrato de Prestação de Serviços**, que se regerá pelas seguintes cláusulas e condições:

---

### 1. DAS PARTES

**CONTRATANTE:**
- **Nome / Razão Social:** {{cliente.nome}}
- **Empresa:** {{cliente.empresa}}
- **CPF / CNPJ:** {{cliente.cnpj}}
- **Telefone:** {{cliente.telefone}}
- **E-mail:** {{cliente.email}}

**CONTRATADA:**
- **Razão Social:** {{empresa.razao_social}}
- **CNPJ:** {{empresa.cnpj}}
- **Endereço:** {{empresa.endereco}}
- **Representante Legal:** {{empresa.representante}} (CPF: {{empresa.rep_cpf}})

---

### 2. CLÁUSULA PRIMEIRA — DO OBJETO E ENTREGÁVEIS

O presente contrato tem por objeto a prestação dos seguintes serviços pela **CONTRATADA** em favor da **CONTRATANTE**:

{{contrato.servicos}}

---

### 3. CLÁUSULA SEGUNDA — DO VALOR E FORMA DE PAGAMENTO

Pela prestação dos serviços objeto deste contrato, a **CONTRATANTE** pagará à **CONTRATADA**:

- **Valor Total:** **{{contrato.valor_total}}**
- **Condições de Pagamento:** {{contrato.pagamento}}

---

### 4. CLÁUSULA TERCEIRA — DAS DISPOSIÇÕES GERAIS E VIGÊNCIA

1. A **CONTRATADA** compromete-se a executar os serviços descritos no Objeto com qualidade técnica e dentro do cronograma estipulado.
2. A **CONTRATANTE** compromete-se a disponibilizar todas as informações e acessos necessários para a perfeita execução dos serviços.
3. O presente contrato passa a vigorar na data de sua assinatura por ambas as partes.

**Data de Emissão:** {{contrato.data}}
`

// Substitui {{grupo.campo}} e variações pelos valores.
export function renderContract(body: string, data: ContractRenderData): string {
  const content = (body && body.trim().length > 0) ? body : DEFAULT_CONTRACT_TEMPLATE

  const flatMap: Record<string, string> = {
    // Empresa / Contratada
    'empresa.razao_social': data.empresa.razao_social || '____________',
    'empresa_razao_social': data.empresa.razao_social || '____________',
    'empresa': data.empresa.razao_social || '____________',
    'contratada': data.empresa.razao_social || '____________',
    'empresa.cnpj': data.empresa.cnpj || '____________',
    'empresa_cnpj': data.empresa.cnpj || '____________',
    'empresa.endereco': data.empresa.endereco || '____________',
    'empresa_endereco': data.empresa.endereco || '____________',
    'empresa.representante': data.empresa.representante || '____________',
    'empresa_representante': data.empresa.representante || '____________',
    'empresa.rep_cpf': data.empresa.rep_cpf || '____________',
    'empresa_rep_cpf': data.empresa.rep_cpf || '____________',

    // Cliente / Contratante
    'cliente.nome': data.cliente.nome || '____________',
    'cliente_nome': data.cliente.nome || '____________',
    'nome_cliente': data.cliente.nome || '____________',
    'cliente': data.cliente.nome || '____________',
    'contratante': data.cliente.nome || '____________',
    'cliente.empresa': data.cliente.empresa || '____________',
    'cliente_empresa': data.cliente.empresa || '____________',
    'cliente.cnpj': data.cliente.cnpj || '____________',
    'cliente_cnpj': data.cliente.cnpj || '____________',
    'cnpj_cliente': data.cliente.cnpj || '____________',
    'cliente.telefone': data.cliente.telefone || '____________',
    'cliente_telefone': data.cliente.telefone || '____________',
    'cliente.email': data.cliente.email || '____________',
    'cliente_email': data.cliente.email || '____________',

    // Contrato
    'contrato.servicos': data.contrato.servicos || '____________',
    'contrato_servicos': data.contrato.servicos || '____________',
    'servicos': data.contrato.servicos || '____________',
    'objeto': data.contrato.servicos || '____________',

    'contrato.valor_total': data.contrato.valor_total || '____________',
    'contrato_valor_total': data.contrato.valor_total || '____________',
    'valor_total': data.contrato.valor_total || '____________',
    'valor': data.contrato.valor_total || '____________',

    'contrato.pagamento': data.contrato.pagamento || '____________',
    'contrato_pagamento': data.contrato.pagamento || '____________',
    'pagamento': data.contrato.pagamento || '____________',
    'condicoes_pagamento': data.contrato.pagamento || '____________',

    'contrato.data': data.contrato.data || '____________',
    'contrato_data': data.contrato.data || '____________',
    'data': data.contrato.data || '____________',
  }

  return content.replace(/\{\{\s*([\w.]+)\s*\}\}/gi, (match, rawKey: string) => {
    const key = rawKey.toLowerCase()
    if (flatMap[key] !== undefined) return flatMap[key]

    // Fallback: busca no objeto por grupo.campo
    const [group, field] = key.split('.')
    const val = (data as any)?.[group]?.[field]
    return (val === undefined || val === null || val === '') ? '____________' : String(val)
  })
}

// Gera o hash SHA-256 do texto final (integridade do documento)
export function hashContent(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

// Monta o objeto de dados a partir dos registros do banco
export function buildRenderData(
  tenant: any,
  client: any,
  services: any[],
  opts: { totalValue?: number | string; paymentTerms?: string }
): ContractRenderData {
  const endereco = [
    tenant?.addressStreet,
    tenant?.addressDistrict,
    tenant?.addressCity,
    tenant?.addressState,
    tenant?.addressZip,
  ]
    .filter(Boolean)
    .join(', ')

  const servicosFmt =
    services && services.length > 0
      ? services
          .map(
            (s) =>
              `- **${s.description}**${s.quantity > 1 ? ` (x${s.quantity})` : ''}${
                s.unitPrice ? ` — R$ ${parseFloat(s.unitPrice).toFixed(2)}` : ''
              }`
          )
          .join('\n')
      : '- Prestação de Serviços'

  const numericValue = opts.totalValue ? parseFloat(String(opts.totalValue)) : 0

  return {
    empresa: {
      razao_social: tenant?.legalName || tenant?.name || 'Minha Empresa',
      cnpj: tenant?.companyCnpj || 'Não informado',
      endereco: endereco || 'Endereço não cadastrado',
      representante: tenant?.legalRepName || tenant?.name || 'Representante Legal',
      rep_cpf: tenant?.legalRepCpf || 'Não informado',
    },
    cliente: {
      nome: client?.name || 'Cliente',
      empresa: client?.companyName || client?.name || 'Não informada',
      cnpj: client?.cnpj || client?.cpf || 'Não informado',
      telefone: client?.phone || 'Não informado',
      email: client?.email || 'Não informado',
    },
    contrato: {
      servicos: servicosFmt,
      valor_total: numericValue > 0 ? `R$ ${numericValue.toFixed(2)}` : 'A combinar',
      pagamento: opts.paymentTerms || 'A combinar',
      data: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date()),
    },
  }
}
