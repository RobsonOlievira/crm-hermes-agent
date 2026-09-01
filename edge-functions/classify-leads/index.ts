import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { AUTO_LEAD_KEYS, computeTargetKeys, type ClassificationInput } from "./classification.ts"

// classify-leads — Backfill da classificação automática de leads no CRM.
//
// Varre os leads de um tenant, cruza com os students (por e-mail) e com o
// formulário persistido no Lead, recalcula o conjunto-alvo de LeadTypes e
// reconcilia a tabela LeadLeadType (adiciona os que faltam, remove os tipos
// gerenciados que não se aplicam mais).
//
// Processamento em memória por páginas para respeitar rate limit. Retomável:
// use `?start=<offset>` para continuar de onde parou.
//
// Query params: tenantId (opcional), start (offset, default 0), limit (default 300).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const DEFAULT_TENANT_ID = Deno.env.get("DEFAULT_TENANT_ID") ?? "a2faa3b0-d158-484b-8842-cfc1898d5af3"

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

Deno.serve(async (req: Request): Promise<Response> => {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: "not_configured" }, 503)
  }
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const url = new URL(req.url)
  const tenantId = url.searchParams.get("tenantId") ?? DEFAULT_TENANT_ID
  const start = Number(url.searchParams.get("start") ?? 0)
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 300), 1), 1000)

  // 1) Students por e-mail
  const studentsMap = new Map<string, ClassificationInput>()
  {
    const { data: students } = await sb
      .from("Student")
      .select("email, plan, product, status, expiresAt")
      .eq("tenantId", tenantId)
    for (const s of students ?? []) {
      if (!s.email) continue
      studentsMap.set(s.email.toLowerCase(), {
        email: s.email.toLowerCase(),
        plan: s.plan ?? null,
        product: s.product ?? null,
        status: s.status ?? null,
        expiresAt: s.expiresAt ?? null,
        hasStudentData: true,
      })
    }
  }

  // 2) LeadTypes por key
  const byKey = new Map<string, string>()
  {
    const { data: types } = await sb
      .from("LeadType")
      .select("id,key")
      .eq("tenantId", tenantId)
    for (const t of types ?? []) byKey.set((t.key ?? "").toLowerCase(), t.id)
  }

  // 3) Página de leads
  const { data: leads, error: leadErr } = await sb
    .from("Lead")
    .select("id, email, name, formulario")
    .eq("tenantId", tenantId)
    .order("createdAt", { ascending: true })
    .range(start, start + limit - 1)

  if (leadErr) return json({ ok: false, error: "leads_fetch_failed", detail: leadErr.message }, 500)
  if (!leads || leads.length === 0) return json({ ok: true, done: true, processed: 0, start, nextStart: start })

  // 4) Associações atuais dos leads desta página
  const leadIds = leads.map((l) => l.id)
  const currentByLead = new Map<string, Set<string>>()
  {
    const { data: curr, error: currErr } = await sb
      .from("LeadLeadType")
      .select("leadId, leadTypeId")
      .in("leadId", leadIds)
    if (currErr) return json({ ok: false, error: "current_fetch_failed", detail: currErr.message }, 500)
    for (const r of curr ?? []) {
      if (!currentByLead.has(r.leadId)) currentByLead.set(r.leadId, new Set<string>())
      currentByLead.get(r.leadId)!.add(r.leadTypeId)
    }
  }

  const autoTypeValues = AUTO_LEAD_KEYS.map((k) => byKey.get(k)).filter(Boolean) as string[]
  const autoSet = new Set<string>(autoTypeValues)

  // 5) Calcular delta em memória
  const toAdd: Array<{ leadId: string; leadTypeId: string }> = []
  const toRemove: Array<{ leadId: string; leadTypeId: string }> = []
  let classifiedLeads = 0

  for (const lead of leads) {
    const student = lead.email ? studentsMap.get(lead.email.toLowerCase()) : undefined
    const input: ClassificationInput = {
      email: lead.email ?? undefined,
      name: lead.name ?? undefined,
      formulario: lead.formulario ?? null,
      hasStudentData: student ? true : false,
      plan: student?.plan ?? null,
      product: student?.product ?? null,
      status: student?.status ?? null,
      expiresAt: student?.expiresAt ?? null,
    }
    const target = computeTargetKeys(input)
    const targetIds = [...target].map((k) => byKey.get(k)).filter(Boolean) as string[]
    const targetSet = new Set<string>(targetIds)
    const currentSet = currentByLead.get(lead.id) ?? new Set<string>()
    const leadsChanged = [...autoSet].some((id) => !targetSet.has(id) && currentSet.has(id)) ||
      targetIds.some((id) => !currentSet.has(id))
    if (!leadsChanged) continue

    let leadChanged = false
    for (const onlyAutoId of [...currentSet]) {
      if (autoSet.has(onlyAutoId) && !targetSet.has(onlyAutoId)) {
        toRemove.push({ leadId: lead.id, leadTypeId: onlyAutoId })
        leadChanged = true
      }
    }
    for (const id of targetIds) {
      if (!currentSet.has(id)) {
        toAdd.push({ leadId: lead.id, leadTypeId: id })
        leadChanged = true
      }
    }
    if (leadChanged) classifiedLeads++
  }

  // 6) Aplicar deltas em lotes
  const changedLeadIds = new Set<string>([...toAdd.map((r) => r.leadId), ...toRemove.map((r) => r.leadId)])
  for (const leadId of changedLeadIds) {
    const adds = toAdd.filter((r) => r.leadId === leadId).map((r) => r.leadTypeId)
    const removes = toRemove.filter((r) => r.leadId === leadId).map((r) => r.leadTypeId)
    if (removes.length) {
      await sb.from("LeadLeadType").delete().eq("leadId", leadId).in("leadTypeId", removes)
      await sleep(40)
    }
    if (adds.length) {
      await sb.from("LeadLeadType").insert(adds.map((leadTypeId) => ({ leadId, leadTypeId })))
      await sleep(40)
    }
  }

  const total = leads.length
  return json({
    ok: true,
    done: total < limit,
    processed: total,
    classified: classifiedLeads,
    added: toAdd.length,
    removed: toRemove.length,
    start,
    nextStart: start + total,
  })
})
