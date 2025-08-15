'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from './theme-context'

interface ClickRipple {
  x: number
  y: number
  startTime: number
  maxRadius: number
}

export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  const ripplesRef = useRef<ClickRipple[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Simple melodic click sound using notes served from public/sounds
    // Ordered from lowest pitch to highest pitch
    const noteNames = [
      'A3', 'E4',
      'A4', 'B4',
      'C#5', 'E5', 'F#5', 'G#5',
      'A5', 'B5',
      'C#6', 'E6', 'F#6', 'G#6',
      'A6', 'B6',
      'C#7', 'E7', 'F#7', 'G#7',
      'A7'
    ]
    const playClickSound = (clickY: number, surfaceHeight: number) => {
      try {
        // Map vertical position → pitch (bottom = lower notes, top = higher notes)
        const h = Math.max(1, surfaceHeight)
        const yNorm = Math.min(1, Math.max(0, clickY / h))
        const t = 1 - yNorm
        const idx = Math.max(0, Math.min(noteNames.length - 1, Math.round(t * (noteNames.length - 1))))
        const note = noteNames[idx]
        const fileName = `${note}.mp3`
        const url = `/sounds/${encodeURIComponent(fileName)}`
        const audio = new Audio(url)
        audio.volume = 0.25
        // Play without blocking; ignore failures (e.g., autoplay policies)
        void audio.play().catch(() => {})
      } catch {}
    }

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      console.warn('WebGL not supported, falling back to canvas')
      return
    }

    // Enhanced vertex shader with smoothed influence attribute
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute float a_size;
      attribute float a_opacity;
      attribute float a_influence; // smoothed per-dot influence provided by CPU
      
      uniform vec2 u_resolution;
      uniform vec2 u_mouse; // kept for compatibility (unused)
      uniform float u_time; // kept for compatibility (unused)
      uniform vec4 u_ripples[10]; // kept for compatibility (unused)
      uniform int u_rippleCount; // kept for compatibility (unused)
      
      varying float v_opacity;
      varying float v_influence;
      
      void main() {
        vec2 position = a_position / u_resolution * 2.0 - 1.0;
        position.y = -position.y;
        // Use smoothed influence provided by CPU
        float totalInfluence = a_influence;
        float size = a_size + totalInfluence * 7.0;
        
        gl_Position = vec4(position, 0.0, 1.0);
        gl_PointSize = size;
        v_opacity = 0.3 + totalInfluence * 0.5;
        v_influence = totalInfluence;
      }
    `

    // Fragment shader with soft glow based on influence and a configurable color gradient
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform vec3 u_gradientColors[5];
      uniform float u_gradientStops[5];
      varying float v_opacity;
      varying float v_influence;
      
      vec3 gradientColor(float t) {
        float tt = clamp(t, 0.0, 1.0);
        if (tt <= u_gradientStops[0]) return u_gradientColors[0];
        if (tt >= u_gradientStops[4]) return u_gradientColors[4];
        vec3 col = u_gradientColors[4];
        for (int i = 0; i < 4; i++) {
          float a = u_gradientStops[i];
          float b = u_gradientStops[i + 1];
          if (tt >= a && tt <= b) {
            float u = (tt - a) / max(0.0001, (b - a));
            col = mix(u_gradientColors[i], u_gradientColors[i + 1], u);
            break;
          }
        }
        return col;
      }

      void main() {
        float distance = length(gl_PointCoord - 0.5);
        // Core circle with soft edge
        float core = smoothstep(0.5, 0.45, distance);
        // Glow grows stronger with influence and extends from center outwards
        float glow = v_influence * smoothstep(0.5, 0.0, distance) * 1.5;
        
        vec3 grad = gradientColor(v_influence);
        
        float alpha = core * v_opacity + glow * 0.6;
        if (alpha < 0.01) {
          discard;
        }
        vec3 color = grad * (core + glow * 1.5);
        gl_FragColor = vec4(color, alpha);
      }
    `

    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type)
      if (!shader) return null
      
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      
      return shader
    }

    function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
      const program = gl.createProgram()
      if (!program) return null
      
      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)
      
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program))
        gl.deleteProgram(program)
        return null
      }
      
      return program
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    
    if (!vertexShader || !fragmentShader) return

    const program = createProgram(gl, vertexShader, fragmentShader)
    if (!program) return

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const sizeLocation = gl.getAttribLocation(program, 'a_size')
    const opacityLocation = gl.getAttribLocation(program, 'a_opacity')
    const influenceLocation = gl.getAttribLocation(program, 'a_influence')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse')
    const gradientColorsLocation = gl.getUniformLocation(program, 'u_gradientColors[0]')
    const gradientStopsLocation = gl.getUniformLocation(program, 'u_gradientStops[0]')
    const timeLocation = gl.getUniformLocation(program, 'u_time')
    const ripplesLocation = gl.getUniformLocation(program, 'u_ripples')
    const rippleCountLocation = gl.getUniformLocation(program, 'u_rippleCount')

    // Configurable color gradient using Hex values (5 colors)
    // Edit these to customize: grey → light pink → orange → red → purple
    const gradientHexColors = ['#A6A6AD', '#FFB6C1', '#000000', '#3B30FF', '#8000FF']
    const gradientStops = [0.0, 0.25, 0.5, 0.75, 1.0]

    const hexToRgbFloats = (hex: string): [number, number, number] => {
      let h = hex.trim()
      if (h.startsWith('#')) h = h.slice(1)
      if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
      }
      if (h.length !== 6) {
        return [1, 1, 1]
      }
      const r = parseInt(h.slice(0, 2), 16) / 255
      const g = parseInt(h.slice(2, 4), 16) / 255
      const b = parseInt(h.slice(4, 6), 16) / 255
      return [r, g, b]
    }

    const ensureFive = (arr: string[]) => {
      const a = arr.slice(0, 5)
      while (a.length < 5) a.push(a[a.length - 1] || '#FFFFFF')
      return a
    }

    const gradientStopsData = new Float32Array(gradientStops)
    const gradientColorsData = new Float32Array(
      ensureFive(gradientHexColors).flatMap((c) => hexToRgbFloats(c))
    )

    // Create dots data with proportional density
    const dotSize = 3
    const dots: number[] = []
    // Per-dot smoothed influence state (declared before resizeCanvas uses it)
    let smoothedInfluences: number[] = []
    
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      // Measure actual CSS size of the canvas element
      const cssWidth = Math.max(1, canvas.clientWidth || Math.round(window.innerWidth))
      const cssHeight = Math.max(1, canvas.clientHeight || Math.round(window.innerHeight))

      // Set the drawing buffer size to match CSS size * DPR
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      // Ensure element fills the viewport using dynamic viewport units
      canvas.style.width = '100dvw'
      canvas.style.height = '100dvh'

      gl.viewport(0, 0, canvas.width, canvas.height)
      
      // Calculate proportional spacing based on screen width
      // This ensures consistent density across different screen sizes
      const baseWidth = 1200 // Reference width for spacing calculation
      const density = 4.0 // >1.0 = more dots, <1.0 = fewer dots
      const raw = (cssWidth / baseWidth) * 40
      const spacingFloat = Math.max(30, Math.min(50, raw)) / density
      const spacing = Math.max(1, Math.round(spacingFloat)) // round to remove sub-pixel placements

      // Center the grid of dots within the canvas
      const numCols = Math.max(1, Math.floor(cssWidth / spacing))
      const numRows = Math.max(1, Math.floor(cssHeight / spacing))
      const startX = Math.round((cssWidth - (numCols - 1) * spacing) / 2) // round to remove sub-pixel placements
      const startY = Math.round((cssHeight - (numRows - 1) * spacing) / 2) // round to remove sub-pixel placements

      // Recreate dots with centered grid
      dots.length = 0
      for (let i = 0; i < numCols; i++) {
        const x = startX + i * spacing
        for (let j = 0; j < numRows; j++) {
          const y = startY + j * spacing
          dots.push(x, y, dotSize, 0.3) // x, y, size, opacity
        }
      }

      // Align smoothed influences to dot count after rebuild
      const numDots = Math.floor(dots.length / 4)
      smoothedInfluences = new Array(numDots).fill(0)
    }

    resizeCanvas()

    // Create buffers
    const positionBuffer = gl.createBuffer()
    const sizeBuffer = gl.createBuffer()
    const opacityBuffer = gl.createBuffer()
    const influenceBuffer = gl.createBuffer()

    let mouseX = 0
    let mouseY = 0
    let startTime = Date.now()
    let lastTimeSec = 0
    let mouseSuspended = false
    let mouseInfluenceFactor = 1

    // Animation smoothing configuration (milliseconds)
    const influenceLerpInMs = 20 // increase speed
    const influenceLerpOutMs = 300 // decrease speed
    const mouseReenableTauSec = 0.8 // slow fade-in after movement resumes
    
    const resetMouse = () => {
      // Place mouse far away so influence is zero
      mouseX = 1e6
      mouseY = 1e6
    }
    // Default to no highlight until pointer is over canvas
    resetMouse()

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (x >= 0 && y >= 0 && x <= rect.width && y <= rect.height) {
        mouseX = x
        mouseY = y
        // Resume mouse influence and let it fade back in
        mouseSuspended = false
      } else {
        resetMouse()
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      // On any click, pause mouse-based influence until movement resumes
      mouseSuspended = true
      mouseInfluenceFactor = 0
      
      // Ignore clicks that originate from the foreground card for ripples
      const target = e.target as HTMLElement | null
      const isForeground = target && (target.closest('[data-foreground-card]') !== null)
      if (isForeground) return
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      // Only create ripple if the pointer is on the canvas area
      if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return
      
      // Play a melodic click sound mapped by vertical position
      playClickSound(clickY, rect.height)

      // Add new ripple
      const maxRadius = Math.max(rect.width, rect.height)
      ripplesRef.current.push({
        x: clickX,
        y: clickY,
        startTime: (Date.now() - startTime) / 1000,
        maxRadius: maxRadius
      })
      
      // Keep only the most recent 10 ripples
      if (ripplesRef.current.length > 10) {
        ripplesRef.current.shift()
      }
    }

    const animate = () => {
      if (!gl || !program) return

      const nowSec = (Date.now() - startTime) / 1000
      // Ensure canvas size and grid are up to date (handles window/page resize)
      {
        const dpr = window.devicePixelRatio || 1
        const cssWidth = Math.max(1, canvas.clientWidth || Math.round(window.innerWidth))
        const cssHeight = Math.max(1, canvas.clientHeight || Math.round(window.innerHeight))
        const targetWidth = Math.max(1, Math.floor(cssWidth * dpr))
        const targetHeight = Math.max(1, Math.floor(cssHeight * dpr))
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          resizeCanvas()
        }
      }

      // Clean up old ripples (older than 2 seconds)
      ripplesRef.current = ripplesRef.current.filter(ripple => 
        nowSec - ripple.startTime < 2.0
      )

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)

      // Set uniforms (guard for null in case optimizer removes them)
      if (resolutionLocation) gl.uniform2f(resolutionLocation, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1))
      if (mouseLocation) gl.uniform2f(mouseLocation, mouseX, mouseY)
      if (timeLocation) gl.uniform1f(timeLocation, nowSec)
      if (gradientColorsLocation) gl.uniform3fv(gradientColorsLocation, gradientColorsData)
      if (gradientStopsLocation) gl.uniform1fv(gradientStopsLocation, gradientStopsData)
      if (ripplesLocation) {
        const rippleData = new Float32Array(40) // 10 ripples * 4 values each
        for (let i = 0; i < Math.min(ripplesRef.current.length, 10); i++) {
          const ripple = ripplesRef.current[i]
          rippleData[i * 4] = ripple.x
          rippleData[i * 4 + 1] = ripple.y
          rippleData[i * 4 + 2] = ripple.startTime
          rippleData[i * 4 + 3] = ripple.maxRadius
        }
        gl.uniform4fv(ripplesLocation, rippleData)
      }
      if (rippleCountLocation) gl.uniform1i(rippleCountLocation, ripplesRef.current.length)
      
      // Color is driven entirely by gradient uniforms in the fragment shader

      // Set up position buffer
      const positions: number[] = []
      const sizes: number[] = []
      const opacities: number[] = []
      
      for (let i = 0; i < dots.length; i += 4) {
        positions.push(dots[i], dots[i + 1])
        sizes.push(dots[i + 2])
        opacities.push(dots[i + 3])
      }

      // Position buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

      // Size buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(sizeLocation)
      gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0)

      // Opacity buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(opacities), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(opacityLocation)
      gl.vertexAttribPointer(opacityLocation, 1, gl.FLOAT, false, 0, 0)

      // Compute smoothed influences
      const numDots = positions.length / 2
      const mouseRadius = 150
      const ringWidth = 50
      const rippleDuration = 2.0
      const ringScale = 0.5
      const rippleStrength = 0.8

      const currentSec = (Date.now() - startTime) / 1000
      const dt = Math.max(0, currentSec - lastTimeSec)
      lastTimeSec = currentSec

      // Update mouse influence factor (ramps in after suspension)
      if (mouseSuspended) {
        mouseInfluenceFactor = 0
      } else {
        const ramp = 1 - Math.exp(-dt / mouseReenableTauSec)
        mouseInfluenceFactor += (1 - mouseInfluenceFactor) * ramp
      }

      const inTau = Math.max(0.001, influenceLerpInMs / 1000)
      const outTau = Math.max(0.001, influenceLerpOutMs / 1000)
      const inFactor = 1 - Math.exp(-dt / inTau)
      const outFactor = 1 - Math.exp(-dt / outTau)

      if (smoothedInfluences.length !== numDots) {
        smoothedInfluences = new Array(numDots).fill(0)
      }

      for (let i = 0; i < numDots; i++) {
        const x = positions[i * 2]
        const y = positions[i * 2 + 1]

        let influence = 0

        // Mouse influence (suppressed while suspended, then fades in)
        const dx = mouseX - x
        const dy = mouseY - y
        const distSq = dx * dx + dy * dy
        const mouseRadiusSq = mouseRadius * mouseRadius
        if (distSq < mouseRadiusSq) {
          const dist = Math.sqrt(distSq)
          const base = Math.max(0, 1 - dist / mouseRadius)
          influence += base * mouseInfluenceFactor
        }

        // Ripple ring influence
        const rippleCount = Math.min(ripplesRef.current.length, 10)
        for (let r = 0; r < rippleCount; r++) {
          const ripple = ripplesRef.current[r]
          const age = currentSec - ripple.startTime
          if (age <= 0 || age >= rippleDuration) continue
          const radius = age * ripple.maxRadius * ringScale
          const dxr = ripple.x - x
          const dyr = ripple.y - y
          const d = Math.sqrt(dxr * dxr + dyr * dyr)
          const ringDistance = Math.abs(d - radius)
          if (ringDistance < ringWidth) {
            const ringStrengthNorm = 1 - ringDistance / ringWidth
            const fadeOut = 1 - age / rippleDuration
            influence += ringStrengthNorm * fadeOut * rippleStrength
          }
        }

        const current = smoothedInfluences[i] || 0
        const factor = influence > current ? inFactor : outFactor
        smoothedInfluences[i] = current + (influence - current) * factor
      }

      // Influence buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, influenceBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(smoothedInfluences), gl.DYNAMIC_DRAW)
      gl.enableVertexAttribArray(influenceLocation)
      gl.vertexAttribPointer(influenceLocation, 1, gl.FLOAT, false, 0, 0)

      // Enable blending for transparency
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

      // Draw points
      gl.drawArrays(gl.POINTS, 0, positions.length / 2)

      requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resizeCanvas)
    // Track pointer globally; update highlight only when inside canvas rect
    window.addEventListener('pointermove', handlePointerMove as any, { passive: true } as any)
    // Listen at the window to capture clicks anywhere, then filter out foreground card clicks
    window.addEventListener('pointerdown', handlePointerDown as any, { passive: true } as any)
    // Reset when leaving the window or tab loses focus
    const handlePointerOut = (e: PointerEvent) => {
      // If leaving the document/window
      if (!e.relatedTarget) resetMouse()
    }
    const handleBlur = () => resetMouse()
    window.addEventListener('pointerout', handlePointerOut as any)
    window.addEventListener('blur', handleBlur)
    
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('pointermove', handlePointerMove as any)
      window.removeEventListener('pointerdown', handlePointerDown as any)
      window.removeEventListener('pointerout', handlePointerOut as any)
      window.removeEventListener('blur', handleBlur)
    }
  }, [theme])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent', pointerEvents: 'auto' }}
    />
  )
}
