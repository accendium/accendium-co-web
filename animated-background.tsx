'use client'

import { useEffect, useRef, useCallback } from 'react'

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const dotsRef = useRef<Array<{ x: number; y: number; baseSize: number; currentSize: number; opacity: number }>>([])
  const animationRef = useRef<number>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Optimize canvas settings
    ctx.imageSmoothingEnabled = false

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      
      ctx.scale(dpr, dpr)
      ctx.imageSmoothingEnabled = false
      
      // Recreate dots only on resize
      createDots()
    }

    const createDots = () => {
      const dots: Array<{ x: number; y: number; baseSize: number; currentSize: number; opacity: number }> = []
      const spacing = 40
      const dotSize = 2
      const rect = canvas.getBoundingClientRect()

      for (let x = spacing; x < rect.width; x += spacing) {
        for (let y = spacing; y < rect.height; y += spacing) {
          dots.push({
            x,
            y,
            baseSize: dotSize,
            currentSize: dotSize,
            opacity: 0.3
          })
        }
      }
      dotsRef.current = dots
    }

    let lastTime = 0
    const targetFPS = 60
    const frameInterval = 1000 / targetFPS

    const animate = (currentTime: number) => {
      if (currentTime - lastTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      lastTime = currentTime

      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      const mouseX = mouseRef.current.x
      const mouseY = mouseRef.current.y
      const maxDistance = 150
      const maxDistanceSquared = maxDistance * maxDistance

      // Batch drawing operations
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      
      dotsRef.current.forEach(dot => {
        // Use squared distance to avoid expensive sqrt
        const dx = mouseX - dot.x
        const dy = mouseY - dot.y
        const distanceSquared = dx * dx + dy * dy
        
        if (distanceSquared < maxDistanceSquared) {
          const distance = Math.sqrt(distanceSquared)
          const influence = Math.max(0, 1 - distance / maxDistance)
          
          dot.currentSize = dot.baseSize + influence * 4
          dot.opacity = 0.3 + influence * 0.5
          
          ctx.globalAlpha = dot.opacity
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, dot.currentSize, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Reset to base state for distant dots
          dot.currentSize = dot.baseSize
          dot.opacity = 0.3
          
          ctx.globalAlpha = 0.3
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, dot.baseSize, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      ctx.globalAlpha = 1
      animationRef.current = requestAnimationFrame(animate)
    }

    // Throttled mouse move handler
    let ticking = false
    const throttledMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleMouseMove(e)
          ticking = false
        })
        ticking = true
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('mousemove', throttledMouseMove, { passive: true })
    
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', throttledMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [handleMouseMove])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
      style={{ background: 'transparent' }}
    />
  )
}
