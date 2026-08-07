'use client'

/**
 * Liquid Toy — WebGL2 port of the Shadertoy shader "Liquid toy".
 *
 * Original shader: "Liquid toy" by Leon Denise (2022-05-18)
 * Source: https://www.shadertoy.com/view/fljBWc
 * Licensed under CC BY-NC-SA 3.0 (Shadertoy default license).
 *
 * The GLSL below is copied from the original Shadertoy (Common / Buffer A /
 * Image tabs) and adapted to run standalone in WebGL2:
 *   - Buffer A is a ping-ponged float framebuffer (feedback / fake fluid heightmap).
 *   - iChannel0 of Buffer A ("RGBA Noise3D") and iChannel1 of Image ("RGBA Noise
 *     Medium") are Shadertoy assets, so they are generated procedurally here as
 *     seeded uniform RGBA noise (32x32x32 3D and 256x256 2D, both wrapping).
 *   - iMouse is driven by hover instead of click-drag so the blob follows the
 *     cursor on a web page; it falls back to the original orbiting motion when
 *     the pointer leaves the window.
 */

import { useEffect, useRef, useState } from 'react'

type LiquidToyBackgroundProps = {
  /** Extra classes for the canvas (defaults to a fixed, full-viewport layer). */
  className?: string
  /** Device pixel ratio cap. Lower it to trade sharpness for performance. */
  maxPixelRatio?: number
  /** Follow the cursor while it is over the page (default: true). */
  followCursor?: boolean
  /**
   * Enables the original shader's debug view: with this on, hovering the left
   * 10% of the screen splits the image into heightmap / normals / tint.
   */
  showDebugLayers?: boolean
  /** Render the "Liquid toy by Leon Denise" attribution link (default: true). */
  showCredit?: boolean
  /** Play a note on click, pitched by where the click landed (default: true). */
  playClickNotes?: boolean
}

// ---------------------------------------------------------------------------
// Click notes
// ---------------------------------------------------------------------------

// Notes served from public/sounds, ordered from lowest pitch to highest.
const CLICK_NOTES = [
  'A3', 'E4',
  'A4', 'B4',
  'C#5', 'E5', 'F#5', 'G#5',
  'A5', 'B5',
  'C#6', 'E6', 'F#6', 'G#6',
  'A6', 'B6',
  'C#7', 'E7', 'F#7', 'G#7',
  'A7',
]

/** The surface is banded into one zone per note, highest at the top. */
const noteZoneAt = (y: number, surfaceHeight: number) => {
  const height = Math.max(1, surfaceHeight)
  const fromTop = Math.min(1, Math.max(0, y / height))
  return Math.round((1 - fromTop) * (CLICK_NOTES.length - 1))
}

const playNote = (zone: number) => {
  try {
    // The sharps need encoding, otherwise "#" starts a URL fragment.
    const audio = new Audio(`/sounds/${encodeURIComponent(CLICK_NOTES[zone])}.mp3`)
    audio.volume = 0.25
    // Play without blocking; ignore failures (e.g. autoplay policies).
    void audio.play().catch(() => {})
  } catch {}
}

/** Keeps a strum from machine-gunning when the pointer sits on a zone edge. */
const MIN_NOTE_GAP_MS = 45

// ---------------------------------------------------------------------------
// GLSL
// ---------------------------------------------------------------------------

/** How many clicks can be popping at once before the oldest is recycled. */
const POP_COUNT = 4

/** Side of the 2D noise texture, sampled one texel per pixel for the dither. */
const NOISE_2D_SIZE = 256

/**
 * Longest frame the simulation will integrate in one go. Past this the flow
 * runs slow rather than taking a step so large it overshoots (see maxStep in
 * the Buffer A shader), which is the right trade for a background.
 */
const MAX_FRAME_TIME = 0.1

// Shadertoy "Common" tab. iChannel2 / iChannel3 are unused by this shader.
const COMMON_GLSL = /* glsl */ `
// shortcut to sample texture
#define TEX(uv) texture(iChannel0, uv).r
#define TEX1(uv) texture(iChannel1, uv).r

// shorcut for smoothstep uses
#define trace(edge, thin) smoothstep(thin,.0,edge)
#define ss(a,b,t) smoothstep(a,b,t)
`

const VERTEX_GLSL = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

// Shadertoy "Buffer A" tab.
// iChannel0 = RGBA Noise3D, iChannel1 = Buffer A (previous frame).
const BUFFER_A_GLSL = `#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler3D;

uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform vec4 iMouse;
// Where the pointer was on the previous frame, so a fast flick paints the
// whole path it travelled rather than one dot per frame.
uniform vec4 iMousePrev;
uniform sampler3D iChannel0;
uniform sampler2D iChannel1;
// Recent clicks: xy = pixel position, z = time of the click, w = slot in use.
#define POP_COUNT ${POP_COUNT}
uniform vec4 iPops[POP_COUNT];

out vec4 outColor;
${COMMON_GLSL}

// Liquid toy by Leon Denise 2022-05-18
// https://www.shadertoy.com/view/fljBWc
//
// Playing with shading with a fake fluid heightmap

const float speed = .01;
const float scale = .1;
const float falloff = 3.;
const float fade = .4;
const float strength = 1.;
const float range = 5.;

// The flow below is a per-frame displacement, so it is scaled to the frame
// time to keep the simulation running at one speed on any refresh rate.
const float referenceFps = 60.;
// A step may not carry further than the stencil the normal was measured over
// (range/472), or the advection samples past where its own gradient is valid
// and the flow destabilises. This only bites below ~25fps.
const float maxStep = 2.5;

// click pop
const float popDuration = .5;
const float popSpeed = .32;
const float popThickness = .05;
const float popRadius = .3;
const float popPush = 5.;

// distance from p to the segment ab, for painting a stroke as a capsule
float segmentDistance(vec2 p, vec2 a, vec2 b)
{
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa,ba)/max(dot(ba,ba), 1e-8), 0., 1.);
    return length(pa - ba*h);
}

// fractal brownian motion (layers of multi scale noise)
vec3 fbm(vec3 p)
{
    vec3 result = vec3(0);
    float amplitude = 0.5;
    for (float index = 0.; index < 3.; ++index)
    {
        result += texture(iChannel0, p/amplitude).xyz * amplitude;
        amplitude /= falloff;
    }
    return result;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

    // coordinates
    vec2 uv = (fragCoord.xy - iResolution.xy / 2.)/iResolution.y;
    vec2 aspect = vec2(iResolution.x/iResolution.y, 1);
    // uv gets moved onto the blob below, so keep the centered frame for the pops
    vec2 centered = uv;

    // noise
    vec3 spice = fbm(vec3(uv*scale,iTime*speed));

    // sweep a circle from where the pointer was to where it is now, so the
    // stroke is continuous however fast it moves; likewise for the idle orbit
    vec2 from, to;
    if (iMouse.z > .5)
    {
        from = (iMousePrev.xy - iResolution.xy / 2.)/iResolution.y;
        to   = (iMouse.xy - iResolution.xy / 2.)/iResolution.y;
    }
    else
    {
        float t = iTime*2.;
        float tPrev = (iTime - iTimeDelta)*2.;
        from = vec2(cos(tPrev),sin(tPrev))*.3;
        to   = vec2(cos(t),sin(t))*.3;
    }
    float paint = trace(segmentDistance(centered, from, to),.1);

    // pop each recent click: an expanding shockwave ring, plus an outward
    // shove that blows the surrounding fluid away from the impact
    float pop = 0.;
    vec2 popOffset = vec2(0);
    for (int index = 0; index < POP_COUNT; ++index)
    {
        vec4 popData = iPops[index];
        float age = iTime - popData.z;
        if (popData.w < .5 || age < 0. || age > popDuration) continue;

        float decay = 1. - age/popDuration;
        vec2 delta = centered - (popData.xy - iResolution.xy / 2.)/iResolution.y;
        float dist = length(delta);

        pop = max(pop, trace(abs(dist - age*popSpeed), popThickness) * decay);
        popOffset += normalize(delta + 1e-6) * ss(popRadius, 0., dist) * decay*decay * popPush;
    }
    paint = max(paint, pop);

    // expansion
    vec2 offset = vec2(0);
    uv = fragCoord.xy / iResolution.xy;
    vec4 data = texture(iChannel1, uv);
    vec3 unit = vec3(range/472./aspect,0);
    vec3 normal = normalize(vec3(
        TEX1(uv - unit.xz)-TEX1(uv + unit.xz),
        TEX1(uv - unit.zy)-TEX1(uv + unit.zy),
        data.x*data.x)+.001);
    offset -= normal.xy;

    // turbulence
    spice.x *= 6.28*2.;
    spice.x += iTime;
    offset += vec2(cos(spice.x),sin(spice.x));

    // explosion
    offset += popOffset;

    float step = min(iTimeDelta * referenceFps, maxStep);
    uv += strength * offset * step / aspect / 472.;

    // sample buffer
    vec4 frame = texture(iChannel1, uv);

    // temporal fading buffer
    paint = max(paint, frame.x - iTimeDelta * fade);

    // print result
    fragColor = vec4(clamp(paint, 0., 1.));
}

void main() {
  mainImage(outColor, gl_FragCoord.xy);
}
`

// Shadertoy "Image" tab.
// iChannel0 = Buffer A, iChannel1 = RGBA Noise Medium.
const IMAGE_GLSL = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform float iDebugLayers;

out vec4 outColor;
${COMMON_GLSL}

// Liquid toy by Leon Denise 2022-05-18
// https://www.shadertoy.com/view/fljBWc
//
// Playing with shading with a fake fluid heightmap

// 2023-01-20 update:
// fix scalars to be resolution independant
// (samed speed and look at different frame size)

// dither
const float ditherScale = ${NOISE_2D_SIZE}.;
const float ditherStrength = .05;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

    // coordinates
    vec2 uv = fragCoord.xy / iResolution.xy;
    // one noise texel per pixel, so the dither reads as fine grain rather
    // than the soft blotches a stretched sample gives
    vec3 dither = texture(iChannel1, fragCoord.xy / ditherScale).rgb;

    // value from buffer A
    vec4 data =  texture(iChannel0, uv);
    float gray = data.x;

    // gradient normal from gray value
    float range = 3.;
    vec2 aspect = vec2(iResolution.x/iResolution.y, 1);
    vec3 unit = vec3(range/472./aspect,0);
    vec3 normal = normalize(vec3(
        TEX(uv + unit.xz)-TEX(uv - unit.xz),
        TEX(uv - unit.zy)-TEX(uv + unit.zy),
        gray*gray*gray));

    // backlight
    vec3 color = vec3(.3)*(1.-abs(dot(normal, vec3(0,0,1))));

    // specular light
    vec3 dir = normalize(vec3(0,1,2));
    float specular = pow(dot(normal, dir)*.5+.5,20.);
    color += vec3(.5)*ss(.2,1.,specular);

    // rainbow
    vec3 tint = .5+.5*cos(vec3(1,2,3)*1.+dot(normal, dir)*4.-uv.y*3.-3.);
    color += tint * smoothstep(.15,.0,gray);

    // dither
    color -= dither.x*ditherStrength;

    // background blend
    vec3 background = vec3(1);
    background *= smoothstep(1.5,-.5,length(uv-.5));
    color = mix(background, clamp(color, 0., 1.), ss(.01,.1,gray));

    // display layers when clic
    // (opt-in here, so hovering the left edge of a page does not trigger it)
    if (iDebugLayers > .5 && iMouse.z > 0.5 && iMouse.x/iResolution.x < .1)
    {
        if (uv.x < .33) color = vec3(gray);
        else if (uv.x < .66) color = normal*.5+.5;
        else color = vec3(tint);
    }

    fragColor = vec4(color, 1);
}

void main() {
  mainImage(outColor, gl_FragCoord.xy);
}
`

// ---------------------------------------------------------------------------
// WebGL helpers
// ---------------------------------------------------------------------------

type RenderTarget = {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
}

const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Liquid toy shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

const createProgram = (gl: WebGL2RenderingContext, fragmentSource: string) => {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_GLSL)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  // The shaders live only inside this program.
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Liquid toy program link error:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }

  return program
}

// Deterministic PRNG (mulberry32) so the noise textures look the same every load.
const createRandom = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stand-in for Shadertoy's "RGBA Noise3D" asset (32x32x32, uint8, tiling). */
const createNoise3DTexture = (gl: WebGL2RenderingContext, size: number, random: () => number) => {
  const data = new Uint8Array(size * size * size * 4)
  for (let i = 0; i < data.length; i++) data[i] = (random() * 256) | 0

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_3D, texture)
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, size, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT)
  gl.bindTexture(gl.TEXTURE_3D, null)

  return texture
}

/** Stand-in for Shadertoy's "RGBA Noise Medium" asset (256x256, uint8, tiling). */
const createNoise2DTexture = (gl: WebGL2RenderingContext, size: number, random: () => number) => {
  const data = new Uint8Array(size * size * 4)
  for (let i = 0; i < data.length; i++) data[i] = (random() * 256) | 0

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  // Nearest, and no mips: the dither samples this one texel per pixel, and
  // any filtering there would only smear the grain back into blotches.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.bindTexture(gl.TEXTURE_2D, null)

  return texture
}

/**
 * Buffer A render target: linear filtering + clamp to edge, matching Shadertoy's
 * buffer defaults. Half float keeps the heightmap smooth; RGBA8 is a fine
 * fallback because the buffer only ever stores a clamped 0..1 value.
 */
const createRenderTarget = (
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  internalFormat: number,
  type: number
): RenderTarget | null => {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, gl.RGBA, type, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const framebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)

  if (!complete) {
    gl.deleteFramebuffer(framebuffer)
    gl.deleteTexture(texture)
    return null
  }

  return { texture, framebuffer }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LiquidToyBackground({
  className = 'fixed inset-0 z-0 h-full w-full',
  maxPixelRatio = 2,
  followCursor = true,
  showDebugLayers = false,
  showCredit = true,
  playClickNotes = true,
}: LiquidToyBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Bumped when the GL context is restored, to rebuild every GPU resource.
  const [contextEpoch, setContextEpoch] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    })

    if (!gl) {
      console.warn('Liquid toy background: WebGL2 is required (3D textures + float buffers).')
      return
    }

    const bufferProgram = createProgram(gl, BUFFER_A_GLSL)
    const imageProgram = createProgram(gl, IMAGE_GLSL)
    if (!bufferProgram || !imageProgram) return

    const uniform = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name)
    const bufferUniforms = {
      resolution: uniform(bufferProgram, 'iResolution'),
      time: uniform(bufferProgram, 'iTime'),
      timeDelta: uniform(bufferProgram, 'iTimeDelta'),
      mouse: uniform(bufferProgram, 'iMouse'),
      mousePrev: uniform(bufferProgram, 'iMousePrev'),
      channel0: uniform(bufferProgram, 'iChannel0'),
      channel1: uniform(bufferProgram, 'iChannel1'),
      pops: uniform(bufferProgram, 'iPops[0]'),
    }
    const imageUniforms = {
      resolution: uniform(imageProgram, 'iResolution'),
      time: uniform(imageProgram, 'iTime'),
      mouse: uniform(imageProgram, 'iMouse'),
      channel0: uniform(imageProgram, 'iChannel0'),
      channel1: uniform(imageProgram, 'iChannel1'),
      debugLayers: uniform(imageProgram, 'iDebugLayers'),
    }

    // Fullscreen triangle.
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    for (const program of [bufferProgram, imageProgram]) {
      const location = gl.getAttribLocation(program, 'aPosition')
      if (location >= 0) {
        gl.enableVertexAttribArray(location)
        gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
      }
    }

    const random = createRandom(0x5eed1071)
    const noise3D = createNoise3DTexture(gl, 32, random)
    const noise2D = createNoise2DTexture(gl, NOISE_2D_SIZE, random)

    // Half float needs a color-buffer extension to be renderable; without one
    // the buffer falls back to 8 bit, which the shader tolerates.
    const canRenderFloat = Boolean(
      gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float')
    )
    let bufferInternalFormat = canRenderFloat ? gl.RGBA16F : gl.RGBA8
    let bufferType = canRenderFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE

    let targets: [RenderTarget, RenderTarget] | null = null
    let bufferWidth = 0
    let bufferHeight = 0

    const disposeTargets = () => {
      if (!targets) return
      for (const target of targets) {
        gl.deleteFramebuffer(target.framebuffer)
        gl.deleteTexture(target.texture)
      }
      targets = null
    }

    /** (Re)allocates the ping-pong pair. Buffer contents reset, as on Shadertoy. */
    const allocateTargets = (width: number, height: number) => {
      disposeTargets()

      const build = () => {
        const a = createRenderTarget(gl, width, height, bufferInternalFormat, bufferType)
        const b = createRenderTarget(gl, width, height, bufferInternalFormat, bufferType)
        if (a && b) return [a, b] as [RenderTarget, RenderTarget]
        if (a) {
          gl.deleteFramebuffer(a.framebuffer)
          gl.deleteTexture(a.texture)
        }
        if (b) {
          gl.deleteFramebuffer(b.framebuffer)
          gl.deleteTexture(b.texture)
        }
        return null
      }

      targets = build()
      if (!targets && bufferInternalFormat !== gl.RGBA8) {
        bufferInternalFormat = gl.RGBA8
        bufferType = gl.UNSIGNED_BYTE
        targets = build()
      }

      if (!targets) {
        console.warn('Liquid toy background: could not allocate the simulation buffer.')
        return false
      }

      // Start from an empty heightmap.
      for (const target of targets) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      bufferWidth = width
      bufferHeight = height
      return true
    }

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, Math.max(0.5, maxPixelRatio))
      const cssWidth = Math.max(1, canvas.clientWidth || window.innerWidth)
      const cssHeight = Math.max(1, canvas.clientHeight || window.innerHeight)
      const width = Math.max(1, Math.floor(cssWidth * ratio))
      const height = Math.max(1, Math.floor(cssHeight * ratio))

      if (canvas.width === width && canvas.height === height && targets) return true

      canvas.width = width
      canvas.height = height
      return allocateTargets(width, height)
    }

    if (!resize()) {
      disposeTargets()
      return
    }

    let animationFrame = 0
    let running = true
    const startTime = performance.now()
    let previousTime = startTime
    const elapsed = () => (performance.now() - startTime) / 1000

    // iMouse: xy in pixels with a bottom-left origin, z > 0 while "pressed".
    // Hover stands in for the press so the blob tracks the cursor on a page.
    const mouse = { x: canvas.width / 2, y: canvas.height / 2, active: 0 }
    // The pointer as of the last rendered frame. The stroke is swept between
    // the two, so it stays unbroken no matter how far the pointer moved.
    const mousePrev = { x: mouse.x, y: mouse.y }

    // Ring buffer of recent clicks, read by the pop loop in Buffer A.
    const pops = new Float32Array(POP_COUNT * 4)
    let popSlot = 0
    const addPop = (x: number, y: number) => {
      const base = popSlot * 4
      pops[base] = x
      pops[base + 1] = y
      pops[base + 2] = elapsed()
      pops[base + 3] = 1
      popSlot = (popSlot + 1) % POP_COUNT
    }

    // A strum: hold the pointer down and sweep it through the note zones.
    const strum = { active: false, zone: -1, lastNoteAt: 0 }
    // Tracked separately from the strum, which the notes can be turned off
    // independently of: this is what suppresses touch scrolling mid-drag.
    let dragging = false

    const endStrum = () => {
      strum.active = false
      strum.zone = -1
    }

    const endDrag = (event: PointerEvent) => {
      dragging = false
      endStrum()
      // A finger has no hover, so lifting it hands the blob back to the orbit.
      if (event.pointerType !== 'mouse') mouse.active = 0
    }

    // Touch drags scroll the page by default, which both moves the page and
    // cancels the pointer stream the stroke is drawn from. Only a drag that
    // began on the background is suppressed, so the page still scrolls
    // normally everywhere else.
    const handleTouchMove = (event: TouchEvent) => {
      if (dragging && event.cancelable) event.preventDefault()
    }

    const strumTo = (clientY: number, rect: DOMRect) => {
      const zone = noteZoneAt(clientY - rect.top, rect.height)
      const now = performance.now()
      if (zone === strum.zone || now - strum.lastNoteAt < MIN_NOTE_GAP_MS) return
      strum.zone = zone
      strum.lastNoteAt = now
      playNote(zone)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      // Once a strum starts on the background it keeps sounding, even if the
      // pointer crosses the card on its way up or down.
      if (strum.active) strumTo(event.clientY, rect)

      if (!followCursor) return
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height
      if (x < 0 || y < 0 || x > canvas.width || y > canvas.height) {
        mouse.active = 0
        return
      }
      // Re-entering the canvas must not sweep a stroke in from wherever the
      // pointer was last seen.
      if (!mouse.active) {
        mousePrev.x = x
        mousePrev.y = canvas.height - y
      }
      mouse.x = x
      // Flip: CSS grows downwards, gl_FragCoord grows upwards.
      mouse.y = canvas.height - y
      mouse.active = 1
    }

    // Falling back to the orbiting blob whenever the cursor is gone. Clearing
    // the drag here too, so a pointer lost off-window cannot leave touch
    // scrolling suppressed.
    const releasePointer = () => {
      mouse.active = 0
      dragging = false
      endStrum()
    }
    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) releasePointer()
    }

    const handlePointerDown = (event: PointerEvent) => {
      // Clicks on the card and its links belong to the foreground, not here.
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-foreground-component]')) return

      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

      dragging = true
      // A touch reports no position until it lands, so seed the stroke here or
      // the first move sweeps in from wherever the pointer was last seen.
      if (!mouse.active) {
        mouse.x = (x / rect.width) * canvas.width
        mouse.y = canvas.height - (y / rect.height) * canvas.height
        mousePrev.x = mouse.x
        mousePrev.y = mouse.y
        mouse.active = 1
      }

      // Pop the fluid at the point of impact.
      addPop(
        (x / rect.width) * canvas.width,
        canvas.height - (y / rect.height) * canvas.height
      )

      if (!playClickNotes) return
      strum.active = true
      strum.zone = noteZoneAt(y, rect.height)
      strum.lastNoteAt = performance.now()
      playNote(strum.zone)
    }

    const render = () => {
      if (!running) return

      if (!resize()) {
        running = false
        return
      }
      if (!targets) return

      const now = performance.now()
      const time = (now - startTime) / 1000
      // Clamped so a stall (or a backgrounded tab) cannot advect the fluid
      // halfway across the screen on the first frame back.
      const timeDelta = Math.min(MAX_FRAME_TIME, Math.max(0, (now - previousTime) / 1000))
      previousTime = now

      // One step per displayed frame: the flow updates as often as the monitor
      // refreshes, and frame time is what keeps its speed constant.
      const [read, write] = targets

      // --- Buffer A: advect and fade the fake fluid heightmap ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer)
      gl.viewport(0, 0, bufferWidth, bufferHeight)
      gl.useProgram(bufferProgram)
      gl.uniform3f(bufferUniforms.resolution, bufferWidth, bufferHeight, 1)
      gl.uniform1f(bufferUniforms.time, time)
      gl.uniform1f(bufferUniforms.timeDelta, timeDelta)
      gl.uniform4f(bufferUniforms.mousePrev, mousePrev.x, mousePrev.y, mouse.active, 0)
      gl.uniform4f(bufferUniforms.mouse, mouse.x, mouse.y, mouse.active, 0)
      gl.uniform4fv(bufferUniforms.pops, pops)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_3D, noise3D)
      gl.uniform1i(bufferUniforms.channel0, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, read.texture)
      gl.uniform1i(bufferUniforms.channel1, 1)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // The freshly written buffer becomes the source for the next frame.
      targets = [write, read]

      // The stroke has been swept up to here; the next frame starts from it.
      mousePrev.x = mouse.x
      mousePrev.y = mouse.y

      // --- Image: shade the heightmap ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(imageProgram)
      gl.uniform3f(imageUniforms.resolution, canvas.width, canvas.height, 1)
      gl.uniform1f(imageUniforms.time, time)
      gl.uniform4f(imageUniforms.mouse, mouse.x, mouse.y, mouse.active, 0)
      gl.uniform1f(imageUniforms.debugLayers, showDebugLayers ? 1 : 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, write.texture)
      gl.uniform1i(imageUniforms.channel0, 0)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, noise2D)
      gl.uniform1i(imageUniforms.channel1, 1)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      animationFrame = requestAnimationFrame(render)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(animationFrame)
      } else if (!running) {
        running = true
        // Start a fresh frame interval so the time spent hidden is not
        // charged to the first frame back.
        previousTime = performance.now()
        animationFrame = requestAnimationFrame(render)
      }
    }

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      running = false
      cancelAnimationFrame(animationFrame)
    }
    const handleContextRestored = () => {
      setContextEpoch((epoch) => epoch + 1)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('pointerup', endDrag, { passive: true })
    window.addEventListener('pointercancel', endDrag, { passive: true })
    // Not passive: this one has to be able to preventDefault.
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('pointerout', handlePointerOut)
    window.addEventListener('blur', releasePointer)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)

    animationFrame = requestAnimationFrame(render)

    return () => {
      running = false
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('pointerout', handlePointerOut)
      window.removeEventListener('blur', releasePointer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)

      disposeTargets()
      gl.deleteTexture(noise3D)
      gl.deleteTexture(noise2D)
      gl.deleteBuffer(vertexBuffer)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(bufferProgram)
      gl.deleteProgram(imageProgram)
    }
  }, [contextEpoch, maxPixelRatio, followCursor, showDebugLayers, playClickNotes])

  return (
    <>
      <canvas ref={canvasRef} className={className} style={{ pointerEvents: 'none' }} aria-hidden />
      {showCredit && (
        <a
          href="https://www.shadertoy.com/view/fljBWc"
          target="_blank"
          rel="noopener noreferrer"
          data-foreground-component
          className="fixed bottom-3 right-3 z-30 text-[10px] tracking-wide text-black/40 transition-colors hover:text-black/70"
        >
          &ldquo;Liquid Toy&rdquo; by Leon Denise
        </a>
      )}
    </>
  )
}
