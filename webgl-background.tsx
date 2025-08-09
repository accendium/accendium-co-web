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

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      console.warn('WebGL not supported, falling back to canvas')
      return
    }

    // Enhanced vertex shader with sine wave ripple effect and click ripples
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute float a_size;
      attribute float a_opacity;
      
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_time;
      uniform vec4 u_ripples[10]; // x, y, startTime, maxRadius for up to 10 ripples
      uniform int u_rippleCount;
      
      varying float v_opacity;
      
      void main() {
        vec2 position = a_position / u_resolution * 2.0 - 1.0;
        position.y = -position.y;
        
        // Cursor interaction effect
        float mouseDistance = length(a_position - u_mouse);
        float mouseInfluence = max(0.0, 1.0 - mouseDistance / 150.0);
        
        // Click ripple effects
        float rippleInfluence = 0.0;
        for (int i = 0; i < 10; i++) {
          if (i >= u_rippleCount) break;
          
          vec4 ripple = u_ripples[i];
          vec2 ripplePos = ripple.xy;
          float rippleStartTime = ripple.z;
          float rippleMaxRadius = ripple.w;
          
          float rippleAge = u_time - rippleStartTime;
          if (rippleAge > 0.0 && rippleAge < 2.0) { // 2 second ripple duration
            float rippleRadius = rippleAge * rippleMaxRadius * 0.5; // Expand over time
            float distanceToRipple = length(a_position - ripplePos);
            
            // Create ring effect - strongest at the expanding edge
            float ringWidth = 50.0;
            float ringDistance = abs(distanceToRipple - rippleRadius);
            if (ringDistance < ringWidth) {
              float ringStrength = (1.0 - ringDistance / ringWidth);
              float fadeOut = 1.0 - (rippleAge / 2.0); // Fade over 2 seconds
              rippleInfluence += ringStrength * fadeOut * 0.8;
            }
          }
        }
        
        // Combine both effects additively
        float totalInfluence = mouseInfluence + rippleInfluence;
        float size = a_size + totalInfluence * 4.0;
        
        gl_Position = vec4(position, 0.0, 1.0);
        gl_PointSize = size;
        v_opacity = 0.3 + totalInfluence * 0.5;
      }
    `

    // Fragment shader remains the same
    const fragmentShaderSource = `
      precision mediump float;
      
      uniform vec3 u_color;
      varying float v_opacity;
      
      void main() {
        float distance = length(gl_PointCoord - 0.5);
        if (distance > 0.5) {
          discard;
        }
        gl_FragColor = vec4(u_color, v_opacity);
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
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse')
    const colorLocation = gl.getUniformLocation(program, 'u_color')
    const timeLocation = gl.getUniformLocation(program, 'u_time')
    const ripplesLocation = gl.getUniformLocation(program, 'u_ripples')
    const rippleCountLocation = gl.getUniformLocation(program, 'u_rippleCount')

    // Create dots data with proportional density
    const dotSize = 3
    const dots: number[] = []
    
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      
      gl.viewport(0, 0, canvas.width, canvas.height)
      
      // Calculate proportional spacing based on screen width
      // This ensures consistent density across different screen sizes
      const baseWidth = 1200 // Reference width for spacing calculation
      const density = 1.1 // >1.0 = more dots, <1.0 = fewer dots
      const raw = (rect.width / baseWidth) * 40
      const spacing = Math.max(30, Math.min(50, raw)) / density

      // Center the grid of dots within the canvas
      const numCols = Math.max(1, Math.floor(rect.width / spacing))
      const numRows = Math.max(1, Math.floor(rect.height / spacing))
      const startX = (rect.width - (numCols - 1) * spacing) / 2
      const startY = (rect.height - (numRows - 1) * spacing) / 2

      // Recreate dots with centered grid
      dots.length = 0
      for (let i = 0; i < numCols; i++) {
        const x = startX + i * spacing
        for (let j = 0; j < numRows; j++) {
          const y = startY + j * spacing
          dots.push(x, y, dotSize, 0.3) // x, y, size, opacity
        }
      }
    }

    resizeCanvas()

    // Create buffers
    const positionBuffer = gl.createBuffer()
    const sizeBuffer = gl.createBuffer()
    const opacityBuffer = gl.createBuffer()

    let mouseX = 0
    let mouseY = 0
    let startTime = Date.now()
    
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
      } else {
        resetMouse()
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore clicks that originate from the foreground card
      const target = e.target as HTMLElement | null
      const isForeground = target && (target.closest('[data-foreground-card]') !== null)
      if (isForeground) return
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      // Only create ripple if the pointer is on the canvas area
      if (clickX < 0 || clickY < 0 || clickX > rect.width || clickY > rect.height) return
      
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

      const currentTime = (Date.now() - startTime) / 1000

      // Clean up old ripples (older than 2 seconds)
      ripplesRef.current = ripplesRef.current.filter(ripple => 
        currentTime - ripple.startTime < 2.0
      )

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)

      // Set uniforms
      gl.uniform2f(resolutionLocation, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1))
      gl.uniform2f(mouseLocation, mouseX, mouseY)
      gl.uniform1f(timeLocation, currentTime)
      
      // Set ripples uniform
      const rippleData = new Float32Array(40) // 10 ripples * 4 values each
      for (let i = 0; i < Math.min(ripplesRef.current.length, 10); i++) {
        const ripple = ripplesRef.current[i]
        rippleData[i * 4] = ripple.x
        rippleData[i * 4 + 1] = ripple.y
        rippleData[i * 4 + 2] = ripple.startTime
        rippleData[i * 4 + 3] = ripple.maxRadius
      }
      gl.uniform4fv(ripplesLocation, rippleData)
      gl.uniform1i(rippleCountLocation, ripplesRef.current.length)
      
      // Set color based on theme
      const color = theme === 'dark' ? [1.0, 1.0, 1.0] : [0.0, 0.0, 0.0]
      gl.uniform3f(colorLocation, color[0], color[1], color[2])

      // Set up position buffer
      const positions = []
      const sizes = []
      const opacities = []
      
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
      className="fixed inset-0 pointer-events-none z-0 w-full h-full"
      style={{ background: 'transparent', pointerEvents: 'auto' }}
    />
  )
}
