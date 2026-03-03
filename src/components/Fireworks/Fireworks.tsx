import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number    // square side in px
  alpha: number
  decay: number
  color: string
}

// Grays matching --theme-pixel-past and nearby shades
const COLORS = ['#b0b0b0', '#c8c8c8', '#989898', '#d0d0d0', '#888888', '#e0e0e0']

function burst(cx: number, cy: number, count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
    const speed = 2.5 + Math.random() * 5
    return {
      x:     cx + (Math.random() - 0.5) * 16,
      y:     cy + (Math.random() - 0.5) * 16,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      size:  Math.floor(Math.random() * 5) + 4,   // 4–8px squares
      alpha: 0.7 + Math.random() * 0.3,
      decay: 0.006 + Math.random() * 0.009,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }
  })
}

export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    let particles: Particle[] = []

    // Spawn a burst at a random position across the viewport
    function spawnRandom() {
      const x = canvas.width  * (0.1 + Math.random() * 0.8)
      const y = canvas.height * (0.1 + Math.random() * 0.7)
      particles.push(...burst(x, y, 16 + Math.floor(Math.random() * 10)))
    }

    // First burst immediately, then one every 700–1200ms
    spawnRandom()
    const interval = setInterval(() => {
      spawnRandom()
    }, 700 + Math.random() * 500)

    let raf: number
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles = particles.filter(p => p.alpha > 0)

      for (const p of particles) {
        p.x  += p.vx
        p.y  += p.vy
        p.vy += 0.05         // gentle gravity
        p.vx *= 0.97         // air friction
        p.vy *= 0.97
        p.alpha -= p.decay

        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.fillStyle   = p.color
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
      }

      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(interval)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 19,
      }}
    />
  )
}
