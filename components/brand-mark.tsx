'use client'

import { LayoutGrid } from 'lucide-react'
import { useBranding } from '@/components/providers/branding-provider'
import Image from 'next/image'
import { useState } from 'react'

export function BrandMark({ showName = true, size = 'md' }: { showName?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const { branding } = useBranding()
  const [imgError, setImgError] = useState(false)
  const box = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
  const text = size === 'lg' ? 'text-xl' : 'text-base'

  return (
    <div className="flex items-center gap-2.5">
      {branding.logoUrl && !imgError ? (
        <div className={`relative ${box} overflow-hidden rounded-lg bg-muted`}>
          <Image src={branding.logoUrl} alt={branding.tenantName} fill className="object-cover" onError={() => setImgError(true)} sizes="44px" />
        </div>
      ) : (
        <div
          className={`flex ${box} items-center justify-center rounded-lg text-white shadow-sm`}
          style={{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))` }}
        >
          <LayoutGrid className="h-1/2 w-1/2" />
        </div>
      )}
      {showName && (
        <span className={`font-display font-bold tracking-tight ${text} text-foreground truncate max-w-[140px]`}>
          {branding.tenantName}
        </span>
      )}
    </div>
  )
}
