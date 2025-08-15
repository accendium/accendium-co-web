'use client'

import Image from 'next/image'
import { useTheme } from './theme-context'
import React, { useEffect, useState } from 'react'

export interface ToolbarItem {
  key: string
  icon: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void
  buttonRef?: React.Ref<HTMLButtonElement>
  ariaLabel?: string
}

export default function Toolbar({ items }: { items: ToolbarItem[] }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 transform z-20 flex items-center gap-3 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`} data-foreground-card>
      {items.map((item) => (
        <button
          key={item.key}
          ref={item.buttonRef as any}
          onClick={item.onClick}
          onPointerDown={item.onPointerDown}
          aria-label={item.ariaLabel || item.key}
          className={`h-12 w-12 rounded-full border backdrop-blur flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDark
              ? 'bg-black/60 border-white/20 text-white hover:bg-white/10 focus:ring-white/40 focus:ring-offset-black'
              : 'bg-white/60 border-black/20 text-black hover:bg-black/10 focus:ring-black/40 focus:ring-offset-white'
          }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}


