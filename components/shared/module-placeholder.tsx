'use client'

import { Card } from '@/components/ui/card'
import { DemoActionButton } from '@/components/shared/demo-action-button'
import { PageHeading } from '@/components/layout/page-heading'
import { Icon } from '@/components/layout/icon'
import { FadeIn } from '@/components/ui/animate'
import { Sparkles, ArrowRight } from 'lucide-react'

export function ModulePlaceholder({
  title,
  description,
  icon,
  features,
}: {
  title: string
  description: string
  icon: string
  features: string[]
}) {
  return (
    <div>
      <PageHeading title={title} description={description} />
      <FadeIn>
        <Card className="overflow-hidden">
          <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-primary/5 to-transparent p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon name={icon} className="h-8 w-8" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Módulo ativo
              </span>
              <h2 className="mt-3 font-display text-xl font-bold">Interface em construção</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Este módulo já está habilitado no seu plano. A experiência completa será disponibilizada em breve.
              </p>
            </div>
          </div>
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            {(features ?? []).map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm">{f}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Quer priorizar este módulo?</p>
            <DemoActionButton label="Falar com o time" variant="outline" title="Fale com o time" description="Em breve você poderá solicitar a ativação prioritária deste módulo diretamente por aqui." />
          </div>
        </Card>
      </FadeIn>
    </div>
  )
}
