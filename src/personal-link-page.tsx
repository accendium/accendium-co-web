"use client";

import Image from "next/image"
import Link from "next/link"
import { useRef, useState, type CSSProperties } from "react"
import { Instagram, Twitter, Linkedin, Github, Globe, Mail, X, Youtube } from 'lucide-react'
import WebGLBackground from './webgl-background'
import Toolbar from './toolbar'
import { useTheme } from './theme-context'

export default function Component() {
  const { theme } = useTheme()
  const [isCardOpen, setIsCardOpen] = useState(true)
  const [isAnimatingClose, setIsAnimatingClose] = useState(false)
  const [shrinkStyle, setShrinkStyle] = useState<CSSProperties | undefined>(undefined)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const logoBtnRef = useRef<HTMLButtonElement | null>(null)
  const [hasShownToolbar, setHasShownToolbar] = useState(false)
  const [showToolbarNow, setShowToolbarNow] = useState(false)
  
  const links = [
    {
      name: "YouTube",
      url: "https://www.youtube.com/@ccendium",
      icon: Youtube,
    },
    {
      name: "Twitter",
      url: "https://twitter.com/ccendium",
      icon: Twitter,
    },
    {
      name: "GitHub",
      url: "https://github.com/accendium",
      icon: Github,
    },
    {
      name: "Email",
      url: "mailto:contact@accendium.co",
      icon: Mail,
    },
  ]

  const isDark = theme === 'dark'

  const closeCard = () => {
    const cardEl = cardRef.current
    const btnEl = logoBtnRef.current
    if (!cardEl) {
      setIsCardOpen(false)
      return
    }
    const startRect = cardEl.getBoundingClientRect()
    const endRect = btnEl ? btnEl.getBoundingClientRect() : (() => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const buttonSize = 3 * rem // h-12 w-12 => 3rem
      const bottomOffset = 1.5 * rem // bottom-6 => 1.5rem
      const left = window.innerWidth / 2 - buttonSize / 2
      const top = window.innerHeight - bottomOffset - buttonSize
      return { left, top, width: buttonSize, height: buttonSize }
    })()
    const translateX = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2)
    const translateY = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2)
    const scaleX = Math.max(0.1, endRect.width / startRect.width)
    const scaleY = Math.max(0.1, endRect.height / startRect.height)
    setIsAnimatingClose(true)
    setHasShownToolbar(true)
    setShrinkStyle({ transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})` })
    // After the move animation completes, fade out while keeping the final transform
    window.setTimeout(() => {
      setIsCardOpen(false)
      setIsAnimatingClose(false)
      // Clear the transform after the fade completes to avoid a visible snap-back
      window.setTimeout(() => {
        setShrinkStyle(undefined)
        // Fade in toolbar only after the card is fully closed
        setShowToolbarNow(true)
      }, 320)
    }, 300)
  }

  const openCard = () => {
    // Hide toolbar immediately when beginning to open the card
    setShowToolbarNow(false)
    const cardEl = cardRef.current
    const btnEl = logoBtnRef.current
    if (!cardEl || !btnEl) {
      setShrinkStyle(undefined)
      setIsCardOpen(true)
      return
    }
    // Prepare: start at toolbar position/size then animate to center (reverse of close)
    const endRect = cardEl.getBoundingClientRect()
    const startRect = btnEl.getBoundingClientRect()
    const translateX = startRect.left + startRect.width / 2 - (endRect.left + endRect.width / 2)
    const translateY = startRect.top + startRect.height / 2 - (endRect.top + endRect.height / 2)
    const scaleX = Math.max(0.1, startRect.width / endRect.width)
    const scaleY = Math.max(0.1, startRect.height / endRect.height)
    // Set initial transform at toolbar
    setShrinkStyle({ transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})` })
    // Show card with low opacity, then animate both transform and opacity to final
    requestAnimationFrame(() => {
      setIsCardOpen(true)
      requestAnimationFrame(() => {
        setShrinkStyle({ transform: 'translate(0px, 0px) scale(1, 1)' })
      })
    })
  }

  return (
    <div className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-black' : 'bg-white'
    }`}>
      {/* GPU-Accelerated Animated Background with Ripple Wave */}
      <WebGLBackground />
      
      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div ref={cardRef} data-foreground-card className={`w-full max-w-md mx-auto backdrop-blur-sm rounded-2xl p-8 border shadow-2xl ${
          isDark 
            ? 'bg-black/90 border-white/20' 
            : 'bg-white/90 border-black/20'
        } ${isCardOpen ? '' : 'pointer-events-none'}`}
          style={{
            ...(shrinkStyle || {}),
            opacity: isCardOpen ? 1 : 0,
            transition: 'transform 300ms ease, opacity 180ms ease',
          }}
        >
          {/* Close button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={closeCard}
              className={`${isDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-black/20 text-black hover:bg-black/10'} h-8 w-8 rounded-md border flex items-center justify-center text-lg leading-none`}
              aria-label="Close profile card"
            >
              ×
            </button>
          </div>
          {/* Header Section */}
          <div className="text-center mb-8">
            {/* Profile Picture */}
            <div className="relative w-[120px] h-[120px] mx-auto mb-6">
              <Image
                src="/logo_white.svg"
                alt="Profile Picture"
                width={120}
                height={120}
                className={`rounded-none border-2 object-cover shadow-lg transition-colors duration-300 ${
                  isDark ? 'border-none' : 'border-none'
                }`}
              />
            </div>
            
            {/* Username */}
            <h1 className={`text-2xl font-semibold mb-2 font-sans transition-colors duration-300 ${
              isDark ? 'text-white' : 'text-black'
            }`}>
              accendium.
            </h1>
            
            {/* Bio/Tagline */}
            <p className={`text-sm font-sans transition-colors duration-300 ${
              isDark ? 'text-white/70' : 'text-black/70'
            }`}>
              developer and creator.
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            {links.map((link, index) => {
              const IconComponent = link.icon
              return (
                <Link
                  key={index}
                  href={link.url}
                  className="group block w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className={`flex items-center justify-center gap-3 py-3.5 px-6 border rounded-xl backdrop-blur-sm transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-lg ${
                    isDark 
                      ? 'border-white/30 bg-black/50 text-white hover:bg-white hover:text-black hover:border-white'
                      : 'border-black/30 bg-white/50 text-black hover:bg-black hover:text-white hover:border-black'
                  }`}>
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium font-sans">{link.name}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom-left toolbar */}
      {hasShownToolbar && showToolbarNow && (
        <Toolbar
          items={[
            {
              key: 'logo',
              icon: (
                <Image src="/logo_white.svg" alt="Open profile card" width={20} height={20} className="opacity-90" />
              ),
              onPointerDown: openCard,
              onClick: (e) => { e.preventDefault() },
              buttonRef: logoBtnRef,
              ariaLabel: 'Open profile card',
            },
          ]}
        />
      )}
    </div>
  )
}
