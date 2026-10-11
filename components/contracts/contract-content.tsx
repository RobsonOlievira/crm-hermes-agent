'use client'

import React from 'react'

interface Props {
  content: string
  className?: string
}

export function ContractContent({ content, className = '' }: Props) {
  if (!content) return null

  // Split lines and parse basic Markdown constructs (headers, bold, hr, bullet points)
  const lines = content.split('\n')

  const renderFormattedText = (text: string) => {
    // Replace **text** with <strong>text</strong>
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-neutral-900 dark:text-neutral-100">
            {part.slice(2, -2)}
          </strong>
        )
      }
      return part
    })
  }

  return (
    <div className={`space-y-3 font-serif text-sm md:text-base leading-relaxed text-neutral-800 dark:text-zinc-200 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim()

        // Empty lines create paragraph breaks
        if (!trimmed) {
          return <div key={idx} className="h-2" />
        }

        // Horizontal Rule
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          return <hr key={idx} className="my-6 border-t border-neutral-200 dark:border-zinc-800" />
        }

        // Heading 1 (# Header)
        if (trimmed.startsWith('# ')) {
          return (
            <h1
              key={idx}
              className="text-xl md:text-2xl font-black text-center text-neutral-900 dark:text-neutral-100 uppercase tracking-tight my-6 pb-2 border-b-2 border-purple-500/30"
            >
              {renderFormattedText(trimmed.slice(2))}
            </h1>
          )
        }

        // Heading 2 (## Header)
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-lg font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide my-4 pt-2 border-b border-neutral-200 dark:border-zinc-800"
            >
              {renderFormattedText(trimmed.slice(3))}
            </h2>
          )
        }

        // Heading 3 (### Header)
        if (trimmed.startsWith('### ')) {
          return (
            <div
              key={idx}
              className="text-sm font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-500 px-3 py-1.5 rounded-r-lg my-4"
            >
              {renderFormattedText(trimmed.slice(4))}
            </div>
          )
        }

        // Bullet points (- Item or * Item)
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-4 my-1">
              <span className="text-purple-500 font-bold mt-1">•</span>
              <div className="flex-1">{renderFormattedText(trimmed.slice(2))}</div>
            </div>
          )
        }

        // Standard Paragraph
        return (
          <p key={idx} className="my-1">
            {renderFormattedText(line)}
          </p>
        )
      })}
    </div>
  )
}
