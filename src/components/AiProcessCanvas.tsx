import { useEffect, useRef } from "react"

type Orb = {
  baseAngle: number
  phase: number
}

type Pulse = {
  nodeIndex: number
  progress: number
  speed: number
  returning: boolean
}

const ACCENT = "#BFE7C6"
const WARN = "#F2B8B5"

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function orbPoint(orb: Orb, index: number, time: number, cx: number, cy: number, rx: number, ry: number) {
  const drift = Math.sin(time / 1400 + orb.phase) * 0.05
  const angle = orb.baseAngle + time / 22000 + drift
  const breathe = 1 + Math.sin(time / 900 + index) * 0.06
  return {
    x: cx + Math.cos(angle) * rx * breathe,
    y: cy + Math.sin(angle) * ry * breathe,
  }
}

export default function AiProcessCanvas({ height = 120 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const orbs: Orb[] = Array.from({ length: 6 }, (_, index) => ({
      baseAngle: (Math.PI * 2 * index) / 6 - Math.PI / 2,
      phase: index * 1.7,
    }))
    const flashes = new Array(orbs.length).fill(0)
    let pulses: Pulse[] = []
    let nextSpawn = 0
    let raf = 0
    let width = 0
    let lastFrame = 0

    const resize = () => {
      const parent = canvas.parentElement
      const nextWidth = Math.max(220, Math.floor(parent?.clientWidth || canvas.clientWidth || 320))
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      width = nextWidth
      canvas.width = Math.round(nextWidth * scale)
      canvas.height = Math.round(height * scale)
      canvas.style.width = `${nextWidth}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
    }

    const spawnPulse = (time: number) => {
      const candidates = orbs
        .map((_, index) => index)
        .filter((index) => !pulses.some((pulse) => pulse.nodeIndex === index && !pulse.returning))
      if (candidates.length === 0) {
        nextSpawn = time + 220
        return
      }
      const nodeIndex = candidates[Math.floor(Math.random() * candidates.length)]
      pulses.push({
        nodeIndex,
        progress: 0,
        speed: 0.0006 + Math.random() * 0.00045,
        returning: false,
      })
      nextSpawn = time + 320 + Math.random() * 460
    }

    const draw = (time: number) => {
      const cx = width / 2
      const cy = height / 2
      const rx = Math.min(width * 0.36, 150)
      const ry = height * 0.3
      const points = orbs.map((orb, index) => orbPoint(orb, index, time, cx, cy, rx, ry))

      ctx.clearRect(0, 0, width, height)

      // Halo behind the chip
      const halo = ctx.createRadialGradient(cx, cy, 6, cx, cy, 70)
      halo.addColorStop(0, "rgba(191, 231, 198, 0.5)")
      halo.addColorStop(1, "rgba(191, 231, 198, 0)")
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, 70, 0, Math.PI * 2)
      ctx.fill()

      // Connections between chip and orbs
      points.forEach((point) => {
        ctx.save()
        ctx.setLineDash([2, 5])
        ctx.strokeStyle = "rgba(0, 0, 0, 0.22)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
        ctx.restore()
      })

      // Pulses
      pulses.forEach((pulse) => {
        const target = points[pulse.nodeIndex]
        const x = pulse.returning
          ? target.x + (cx - target.x) * pulse.progress
          : cx + (target.x - cx) * pulse.progress
        const y = pulse.returning
          ? target.y + (cy - target.y) * pulse.progress
          : cy + (target.y - cy) * pulse.progress
        ctx.fillStyle = pulse.returning ? WARN : ACCENT
        ctx.beginPath()
        ctx.arc(x, y, 3.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "rgba(0, 0, 0, 0.45)"
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // Orbiting data nodes
      points.forEach((point, index) => {
        const flash = flashes[index]
        if (flash > 0) {
          ctx.strokeStyle = `rgba(0, 0, 0, ${0.35 * flash})`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(point.x, point.y, 8 + (1 - flash) * 16, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = "#ffffff"
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = index % 3 === 0 ? WARN : ACCENT
        ctx.beginPath()
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      // Chip body
      const chipSize = 54
      ctx.save()
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)"
      ctx.shadowBlur = 12
      ctx.shadowOffsetY = 3
      roundedRect(ctx, cx - chipSize / 2, cy - chipSize / 2, chipSize, chipSize, 14)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
      ctx.restore()
      roundedRect(ctx, cx - chipSize / 2, cy - chipSize / 2, chipSize, chipSize, 14)
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.stroke()

      // Antenna
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx, cy - chipSize / 2)
      ctx.lineTo(cx, cy - chipSize / 2 - 13)
      ctx.stroke()
      const antennaPulse = reduceMotion ? 1 : 1 + Math.sin(time / 260) * 0.25
      ctx.fillStyle = ACCENT
      ctx.beginPath()
      ctx.arc(cx, cy - chipSize / 2 - 15, 4 * antennaPulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Face
      const blinkCycle = time % 3600
      const blinking = !reduceMotion && blinkCycle > 3400
      ctx.fillStyle = "#000000"
      ;[-10, 10].forEach((offset) => {
        if (blinking) {
          ctx.fillRect(cx + offset - 3, cy - 3, 6, 2)
        } else {
          ctx.beginPath()
          ctx.arc(cx + offset, cy - 2, 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      ctx.strokeStyle = "#000000"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy + 5, 8, Math.PI * 0.18, Math.PI * 0.82)
      ctx.stroke()

      // Cheeks
      ctx.fillStyle = "rgba(242, 184, 181, 0.6)"
      ;[-16, 16].forEach((offset) => {
        ctx.beginPath()
        ctx.arc(cx + offset, cy + 7, 3.2, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    const step = (time: number) => {
      const delta = lastFrame === 0 ? 16 : Math.min(48, time - lastFrame)
      lastFrame = time
      if (!reduceMotion && time > nextSpawn) spawnPulse(time)
      pulses = pulses.filter((pulse) => {
        pulse.progress += pulse.speed * delta * (pulse.returning ? 1.4 : 1)
        if (pulse.progress >= 1) {
          if (pulse.returning) {
            return false
          }
          flashes[pulse.nodeIndex] = 1
          pulses.push({
            nodeIndex: pulse.nodeIndex,
            progress: 0,
            speed: pulse.speed,
            returning: true,
          })
          return false
        }
        return true
      })
      flashes.forEach((value, index) => {
        flashes[index] = Math.max(0, value - delta / 700)
      })
      draw(time)
      raf = window.requestAnimationFrame(step)
    }

    resize()
    if (reduceMotion) {
      draw(0)
    } else {
      raf = window.requestAnimationFrame(step)
    }

    const observer = new ResizeObserver(() => {
      resize()
      if (reduceMotion) draw(0)
    })
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    return () => {
      window.cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [height])

  return (
    <canvas
      ref={canvasRef}
      data-agent="ai-process-canvas"
      aria-hidden="true"
      style={{ display: "block", width: "100%", height }}
    />
  )
}
