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

type Mote = {
  x: number
  y: number
  size: number
  phase: number
  speed: number
}

// Brand hazard orange plus a sage/grey "mythical glade" palette.
const BRAND = "#FF5A00"
const BRAND_LIGHT = "#FF9A5C"
const BRAND_INK = "#2B1400"
const SAGE = "#9ED8A8"
const GOLD = "#E8C57A"
const CREAM = "#FFF3D6"

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
    const motes: Mote[] = Array.from({ length: 18 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.7 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
    }))
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

      // Misty green-grey glade background
      ctx.save()
      roundedRect(ctx, 0, 0, width, height, 10)
      ctx.clip()
      const sky = ctx.createLinearGradient(0, 0, 0, height)
      sky.addColorStop(0, "#EDF1EA")
      sky.addColorStop(0.55, "#D6DED3")
      sky.addColorStop(1, "#BCC7BB")
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, width, height)

      // Drifting mist bands
      for (let i = 0; i < 2; i += 1) {
        const drift = reduceMotion ? 0 : Math.sin(time / (5200 + i * 2600) + i * 2) * width * 0.12
        const mist = ctx.createRadialGradient(
          cx + drift,
          height * (0.72 + i * 0.12),
          4,
          cx + drift,
          height * (0.72 + i * 0.12),
          width * 0.55
        )
        mist.addColorStop(0, i === 0 ? "rgba(158, 216, 168, 0.22)" : "rgba(255, 243, 214, 0.18)")
        mist.addColorStop(1, "rgba(158, 216, 168, 0)")
        ctx.fillStyle = mist
        ctx.fillRect(0, 0, width, height)
      }

      // Twinkling motes
      motes.forEach((mote) => {
        const twinkle = reduceMotion
          ? 0.55
          : 0.25 + 0.75 * Math.abs(Math.sin(time / 1200 * mote.speed + mote.phase))
        const mx = mote.x * width + (reduceMotion ? 0 : Math.sin(time / 4000 + mote.phase) * 3)
        const my = mote.y * height + (reduceMotion ? 0 : Math.cos(time / 4600 + mote.phase) * 2)
        ctx.fillStyle = `rgba(255, 243, 214, ${0.55 * twinkle})`
        ctx.beginPath()
        ctx.arc(mx, my, mote.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Halo behind the chip
      const halo = ctx.createRadialGradient(cx, cy, 6, cx, cy, 74)
      halo.addColorStop(0, "rgba(255, 90, 0, 0.16)")
      halo.addColorStop(0.45, "rgba(232, 197, 122, 0.18)")
      halo.addColorStop(1, "rgba(158, 216, 168, 0)")
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, 74, 0, Math.PI * 2)
      ctx.fill()

      // Slowly turning rune rings
      const ringSpin = reduceMotion ? 0 : time / 9000
      ctx.save()
      ctx.setLineDash([3, 8])
      ctx.lineDashOffset = -ringSpin * 40
      ctx.strokeStyle = "rgba(92, 102, 92, 0.4)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 44, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([1, 7])
      ctx.lineDashOffset = ringSpin * 55
      ctx.strokeStyle = "rgba(158, 216, 168, 0.65)"
      ctx.beginPath()
      ctx.arc(cx, cy, 56, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // Connections between chip and orbs
      points.forEach((point) => {
        ctx.save()
        ctx.setLineDash([2, 5])
        ctx.strokeStyle = "rgba(70, 82, 70, 0.32)"
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
        ctx.save()
        ctx.shadowColor = pulse.returning ? GOLD : SAGE
        ctx.shadowBlur = 8
        ctx.fillStyle = pulse.returning ? GOLD : SAGE
        ctx.beginPath()
        ctx.arc(x, y, 3.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        ctx.strokeStyle = "rgba(43, 20, 0, 0.5)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(x, y, 3.4, 0, Math.PI * 2)
        ctx.stroke()
      })

      // Orbiting data nodes
      points.forEach((point, index) => {
        const flash = flashes[index]
        if (flash > 0) {
          ctx.strokeStyle = `rgba(232, 197, 122, ${0.75 * flash})`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(point.x, point.y, 8 + (1 - flash) * 18, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = "#F7FAF5"
        ctx.strokeStyle = "#2B2B24"
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(point.x, point.y, 8.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = index % 3 === 0 ? GOLD : SAGE
        ctx.beginPath()
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      // Chip body in hazard orange
      const chipSize = 56
      ctx.save()
      ctx.shadowColor = "rgba(43, 20, 0, 0.25)"
      ctx.shadowBlur = 14
      ctx.shadowOffsetY = 3
      roundedRect(ctx, cx - chipSize / 2, cy - chipSize / 2, chipSize, chipSize, 16)
      const body = ctx.createLinearGradient(cx - chipSize / 2, cy - chipSize / 2, cx + chipSize / 2, cy + chipSize / 2)
      body.addColorStop(0, BRAND_LIGHT)
      body.addColorStop(0.55, BRAND)
      body.addColorStop(1, "#D94A00")
      ctx.fillStyle = body
      ctx.fill()
      ctx.restore()
      roundedRect(ctx, cx - chipSize / 2, cy - chipSize / 2, chipSize, chipSize, 16)
      ctx.strokeStyle = "#2B2B24"
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Rune mark on the forehead
      ctx.strokeStyle = "rgba(255, 243, 214, 0.85)"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx, cy - 20)
      ctx.lineTo(cx + 3.5, cy - 14.5)
      ctx.lineTo(cx, cy - 9)
      ctx.lineTo(cx - 3.5, cy - 14.5)
      ctx.closePath()
      ctx.stroke()

      // Antenna with a glowing charm
      ctx.strokeStyle = "#2B2B24"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx, cy - chipSize / 2)
      ctx.lineTo(cx, cy - chipSize / 2 - 13)
      ctx.stroke()
      const antennaPulse = reduceMotion ? 1 : 1 + Math.sin(time / 260) * 0.25
      ctx.save()
      ctx.shadowColor = CREAM
      ctx.shadowBlur = 10
      ctx.fillStyle = CREAM
      ctx.beginPath()
      ctx.arc(cx, cy - chipSize / 2 - 15, 4 * antennaPulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = "#2B2B24"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy - chipSize / 2 - 15, 4 * antennaPulse, 0, Math.PI * 2)
      ctx.stroke()

      // Face
      const blinkCycle = time % 3600
      const blinking = !reduceMotion && blinkCycle > 3400
      ctx.fillStyle = BRAND_INK
      ;[-10, 10].forEach((offset) => {
        if (blinking) {
          ctx.fillRect(cx + offset - 3, cy - 2, 6, 2)
        } else {
          ctx.beginPath()
          ctx.arc(cx + offset, cy - 1, 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
      })
      ctx.strokeStyle = BRAND_INK
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy + 6, 8, Math.PI * 0.18, Math.PI * 0.82)
      ctx.stroke()

      // Cheeks
      ctx.fillStyle = "rgba(255, 243, 214, 0.55)"
      ;[-16, 16].forEach((offset) => {
        ctx.beginPath()
        ctx.arc(cx + offset, cy + 8, 3.2, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.restore()
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
      style={{ display: "block", width: "100%", height, borderRadius: 10 }}
    />
  )
}
