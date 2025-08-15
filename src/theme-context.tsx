'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  // Force dark theme for now, but preserve ability to toggle and persist when enabled later
  useEffect(() => {
    setTheme('dark')
    try {
      const savedTheme = localStorage.getItem('theme') as Theme
      if (savedTheme === 'dark') {
        setTheme('dark')
      }
    } catch {}
    // Ensure the root element has dark class applied regardless of saved state
    try {
      const root = document.documentElement
      root.classList.add('dark')
      root.classList.remove('light')
    } catch {}
  }, [])

  const toggleTheme = () => {
    // Temporarily force dark: do not allow switching to light
    setTheme('dark')
    try {
      localStorage.setItem('theme', 'dark')
      const root = document.documentElement
      root.classList.add('dark')
      root.classList.remove('light')
    } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
