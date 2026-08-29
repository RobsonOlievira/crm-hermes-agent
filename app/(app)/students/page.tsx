export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { PageHeading } from '@/components/layout/page-heading'
import { StudentsTable, StudentRow } from '@/components/students/students-table'
import { DemoActionButton } from '@/components/shared/demo-action-button'

export default async function StudentsPage() {
  const user = await getCurrentUser()
  const tenantId = user?.tenantId ?? null

  const students = tenantId
    ? await prisma.student.findMany({
        where: { tenantId },
        orderBy: { enrolledAt: 'desc' },
      })
    : []

  const rows: StudentRow[] = (students as any[]).map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    product: s.product,
    plan: s.plan,
    status: s.status,
    progress: s.progress,
    amountPaid: s.amountPaid,
    enrolledAt: s.enrolledAt ? new Date(s.enrolledAt).toISOString() : null,
    expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : null,
    lastAccessAt: s.lastAccessAt ? new Date(s.lastAccessAt).toISOString() : null,
    avatarUrl: s.avatarUrl,
  }))

  return (
    <div>
      <PageHeading
        title="Alunos"
        description="Sua base de alunos e mentorados. Em breve ela será preenchida automaticamente com as matrículas dos seus outros produtos."
        actions={
          <DemoActionButton
            label="Novo Aluno"
            icon="GraduationCap"
            title="Cadastro de alunos"
            description="O cadastro manual e a integração automática com seus produtos serão disponibilizados na próxima etapa desta interface."
          />
        }
      />
      <StudentsTable students={rows} />
    </div>
  )
}
