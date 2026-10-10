'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortableHeaderProps = {
  className?: string
  children: React.ReactNode
  active: boolean
  /** true = ascending, false = descending */
  direction: 'asc' | 'desc'
  onClick: () => void
  align?: 'left' | 'right'
}

export function SortableHeader({
  className,
  children,
  active,
  direction,
  onClick,
  align = 'left',
}: SortableHeaderProps) {
  return (
    <TableHead className={cn(align === 'right' && 'text-right', className)}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group inline-flex items-center gap-1 whitespace-nowrap select-none',
          align === 'right' && 'flex-row-reverse justify-end',
          active ? 'text-foreground' : 'hover:text-foreground',
        )}
      >
        {children}
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100" />
        )}
      </button>
    </TableHead>
  )
}

export type SortDirection = 'asc' | 'desc'
export type SortState<T extends string> = { key: T; direction: SortDirection }

/** Toggle helper: sorting a new column starts asc; toggling the same column flips direction. */
export function toggleSort<T extends string>(prev: SortState<T>, key: T): SortState<T> {
  if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
  return { key, direction: 'asc' }
}