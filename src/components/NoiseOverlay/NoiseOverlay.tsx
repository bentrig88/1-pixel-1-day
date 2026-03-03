import { useEffect, useRef } from 'react'

// ── Vertex shader — just a fullscreen quad ────────────────────────────────────
const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

// ── Fragment shader — classic hash-based noise, seeded by frame counter ───────
const FRAG = `
  precision mediump float;
  uniform float u_frame;
  uniform vec2  u_res;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    float n = hash(uv + u_frame);
    gl_FragColor = vec4(n, n, n, 1.0);
  }
`

interface Props {
  opacity?: number  // default 0.04
  fps?: number      // grain refresh rate, default 24 (film-like)
}

export function NoiseOverlay({ opacity = 0.04, fps = 12 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const gl = canvas.getContext('webgl')
    if (!gl) return

    // ── Compile & link shaders ──────────────────────────────────────────
    function compileShader(type: number, src: string) {
      const sh = gl!.createShader(type)!
      gl!.shaderSource(sh, src)
      gl!.compileShader(sh)
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    // ── Fullscreen quad (2 triangles) ───────────────────────────────────
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,   1, -1,  -1,  1,
      -1,  1,   1, -1,   1,  1,
    ]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const frameLoc = gl.getUniformLocation(prog, 'u_frame')
    const resLoc   = gl.getUniformLocation(prog, 'u_res')

    // ── Resize handling ─────────────────────────────────────────────────
    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl!.viewport(0, 0, canvas.width, canvas.height)
      gl!.uniform2f(resLoc, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Render loop — throttled to `fps` to mimic film grain ───────────
    let raf: number
    let frame = 0
    let lastTime = 0
    const interval = 1000 / fps

    function draw(now: number) {
      raf = requestAnimationFrame(draw)
      if (now - lastTime < interval) return
      lastTime = now
      gl!.uniform1f(frameLoc, frame++)
      gl!.drawArrays(gl!.TRIANGLES, 0, 6)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [fps])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        opacity,
        pointerEvents: 'none',
        zIndex: 9999,
        mixBlendMode: 'soft-light',
      }}
    />
  )
}
