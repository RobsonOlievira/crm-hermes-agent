/**
 * Utilitários para cálculos de métricas de tráfego pago
 */

/** Custo por Lead — quanto custou cada lead atribuído */
export function calcCPL(totalSpend: number, totalLeads: number): number {
  if (totalLeads <= 0) return 0
  return totalSpend / totalLeads
}

/** Custo de Aquisição de Cliente — quanto custou cada conversão */
export function calcCAC(totalSpend: number, totalConversions: number): number {
  if (totalConversions <= 0) return 0
  return totalSpend / totalConversions
}

/** Retorno sobre Investimento (%) */
export function calcROI(totalRevenue: number, totalSpend: number): number {
  if (totalSpend <= 0) return 0
  return ((totalRevenue - totalSpend) / totalSpend) * 100
}

/** ROAS — retorno financeiro por real investido */
export function calcROAS(totalRevenue: number, totalSpend: number): number {
  if (totalSpend <= 0) return 0
  return totalRevenue / totalSpend
}

/** Taxa de conversão Lead → Cliente (%) */
export function calcConversionRate(totalConversions: number, totalLeads: number): number {
  if (totalLeads <= 0) return 0
  return (totalConversions / totalLeads) * 100
}
