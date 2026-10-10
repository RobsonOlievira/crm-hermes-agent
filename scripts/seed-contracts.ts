import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultTemplate = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

Por este instrumento particular, as partes abaixo qualificadas celebram o presente Contrato de Prestação de Serviços, que se regerá pelas seguintes cláusulas e condições:

DAS PARTES

CONTRATANTE:
Nome/Razão Social: {{cliente.nome}}
CNPJ/CPF: {{cliente.cnpj}}
Telefone: {{cliente.telefone}}
E-mail: {{cliente.email}}

CONTRATADA:
Nome/Razão Social: {{empresa.razao_social}}
CNPJ: {{empresa.cnpj}}
Endereço: {{empresa.endereco}}
Representante Legal: {{empresa.representante}} (CPF: {{empresa.rep_cpf}})

CLÁUSULA PRIMEIRA - DO OBJETO
O presente contrato tem por objeto a prestação dos seguintes serviços pela CONTRATADA à CONTRATANTE:
{{contrato.servicos}}

CLÁUSULA SEGUNDA - DO VALOR E FORMA DE PAGAMENTO
Pela prestação dos serviços objeto deste contrato, a CONTRATANTE pagará à CONTRATADA o valor total de {{contrato.valor_total}}.
Condições de Pagamento: {{contrato.pagamento}}

CLÁUSULA TERCEIRA - DAS DISPOSIÇÕES GERAIS
O presente contrato entra em vigor na data de sua assinatura.

Data de Emissão: {{contrato.data}}
`

async function main() {
  console.log('Iniciando seed de Contratos...')
  const tenants = await prisma.tenant.findMany()

  for (const tenant of tenants) {
    const existing = await prisma.contractTemplate.findFirst({
      where: { tenantId: tenant.id }
    })
    
    if (!existing) {
      await prisma.contractTemplate.create({
        data: {
          tenantId: tenant.id,
          name: 'Contrato Padrão de Prestação de Serviços',
          description: 'Modelo básico com serviços, valores e assinaturas.',
          body: defaultTemplate,
          isDefault: true,
        }
      })
      console.log(`Template padrão criado para o tenant: ${tenant.id}`)
    }
  }

  // Se o tenant principal não tiver dados jurídicos, colocar uns de teste
  const firstTenant = tenants[0]
  if (firstTenant && !firstTenant.companyCnpj) {
    await prisma.tenant.update({
      where: { id: firstTenant.id },
      data: {
        legalName: 'Minha Agência LTDA',
        companyCnpj: '00.000.000/0001-00',
        companyEmail: 'contato@agencia.com',
        addressStreet: 'Av. Paulista',
        addressCity: 'São Paulo',
        addressState: 'SP',
        legalRepName: 'João Silva',
        legalRepCpf: '111.222.333-44'
      }
    })
    console.log(`Dados jurídicos de teste adicionados ao tenant: ${firstTenant.id}`)
  }

  console.log('Seed de Contratos finalizado!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
