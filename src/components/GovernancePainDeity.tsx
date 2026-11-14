import { useEffect, useLayoutEffect, useRef, useState } from "react"
import AiProcessCanvas from "./AiProcessCanvas"

// The God of Configuration & Governance Pain. Summoned by holding 2 + 6
// (ISO 26262) together; same chord or Escape banishes it. Deliberately
// undocumented. Reuses the contemplative AiProcessCanvas figure unchanged.

const CANVAS_HEIGHT = 220
const MAX_WIDTH = 440
const MARGIN = 8
const MAX_TILT = 14 // degrees
const MIN_WIDTH = 240
const SUMMON_CODES = ["Digit2", "Digit6"] as const

type Point = { x: number; y: number }

// Last drop position: survives toggles within the page, never a reload.
let lastDrop: Point | null = null

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  if (target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return true
  return target instanceof HTMLElement && target.isContentEditable
}

function isDialogOpen() {
  return !!document.querySelector(".modal, [role='dialog'], [role='alertdialog'], [aria-modal='true'], dialog[open]")
}

/** Toggles visibility when 2 and 6 are held together (either order). */
function useSummonChord(onChord: () => void) {
  const onChordRef = useRef(onChord)
  useEffect(() => {
    onChordRef.current = onChord
  })

  useEffect(() => {
    const held = new Set<string>()
    let armed = false // true while the current invocation is still held

    const reset = () => {
      held.clear()
      armed = false
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!SUMMON_CODES.includes(e.code as (typeof SUMMON_CODES)[number])) return
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isEditableTarget(e.target)) return
      held.add(e.code)
      if (!armed && SUMMON_CODES.every((code) => held.has(code))) {
        armed = true
        onChordRef.current()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!held.delete(e.code)) return
      armed = false
    }
    const onVisibility = () => reset()

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", reset)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", reset)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])
}

export default function GovernancePainDeity() {
  const [visible, setVisible] = useState(false)
  useSummonChord(() => setVisible((v) => !v))

  useEffect(() => {
    if (!visible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || isDialogOpen()) return
      setVisible(false)
    }
    // Bubble phase on window: runs after component-level Escape handlers.
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [visible])

  return visible ? <DeityOverlay /> : null
}

function DeityOverlay() {
  const elRef = useRef<HTMLDivElement | null>(null)
  const width = Math.min(MAX_WIDTH, Math.max(240, window.innerWidth - 2 * MARGIN - 32))

  useLayoutEffect(() => {
    const el = elRef.current
    if (!el) return
    const reduceMotion = prefersReducedMotion()

    const pos: Point = { x: 0, y: 0 }
    let angle = 0
    let angularVel = 0
    let targetAngle = 0
    // Tentacle wobble: the real width (the canvas reflows its orbs) is a spring
    // chasing a target that thins with drag speed and writhes with a sine.
    const baseWidth = el.offsetWidth
    let curWidth = baseWidth
    let widthVel = 0
    let speed = 0 // smoothed pointer speed, px/ms
    let phase = 0
    let raf = 0
    let drag: { pointerId: number; dx: number; dy: number; lastX: number; lastY: number; lastT: number } | null = null

    const clamp = (p: Point): Point => {
      // Clamp on the resting box so tilt and wobble don't make it jitter.
      const maxX = Math.max(MARGIN, window.innerWidth - baseWidth - MARGIN)
      const maxY = Math.max(MARGIN, window.innerHeight - el.offsetHeight - MARGIN)
      return { x: Math.min(Math.max(p.x, MARGIN), maxX), y: Math.min(Math.max(p.y, MARGIN), maxY) }
    }
    const write = () => {
      // Keep the horizontal center fixed while the width writhes.
      const x = pos.x + (baseWidth - curWidth) / 2
      el.style.width = `${curWidth.toFixed(1)}px`
      el.style.transform = `translate3d(${x}px, ${pos.y}px, 0) rotate(${angle.toFixed(2)}deg)`
    }
    const setPos = (p: Point) => {
      const c = clamp(p)
      pos.x = c.x
      pos.y = c.y
      lastDrop = { ...c }
    }

    // Wiggle: tilt follows horizontal velocity while dragging, then a damped
    // spring settles it back to upright after release.
    const tick = () => {
      raf = 0
      const k = drag ? 0.25 : 0.12
      const damping = drag ? 0.6 : 0.82
      angularVel = (angularVel + (targetAngle - angle) * k) * damping
      angle += angularVel
      if (drag) targetAngle *= 0.85 // ease upright when the pointer pauses
      else targetAngle = 0

      let targetWidth = baseWidth
      if (drag) {
        speed *= 0.9
        const energy = Math.min(1, speed * 1.2)
        phase += 0.3 + energy * 0.5
        targetWidth = baseWidth * (1 - 0.38 * energy) + Math.sin(phase) * baseWidth * (0.07 + 0.13 * energy)
      }
      widthVel = (widthVel + (targetWidth - curWidth) * 0.18) * 0.8
      curWidth = Math.min(baseWidth * 1.12, Math.max(MIN_WIDTH, curWidth + widthVel))

      write()
      const settled =
        Math.abs(angle) < 0.05 && Math.abs(angularVel) < 0.05 && Math.abs(curWidth - baseWidth) < 0.5 && Math.abs(widthVel) < 0.5
      if (drag || !settled) {
        raf = window.requestAnimationFrame(tick)
      } else {
        angle = 0
        angularVel = 0
        curWidth = baseWidth
        widthVel = 0
        write()
      }
    }
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(tick)
    }

    // Initial placement: centered, or where it was last dropped.
    const rect = el.getBoundingClientRect()
    setPos(lastDrop ?? { x: (window.innerWidth - rect.width) / 2, y: (window.innerHeight - rect.height) / 2 })
    write()

    const entrance = reduceMotion
      ? null
      : el.firstElementChild?.animate(
          [
            { opacity: 0, transform: "scale(0.92)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
        )

    const onPointerDown = (e: PointerEvent) => {
      e.stopPropagation()
      if (drag || (e.pointerType === "mouse" && e.button !== 0)) return
      e.preventDefault()
      el.setPointerCapture(e.pointerId)
      drag = { pointerId: e.pointerId, dx: e.clientX - pos.x, dy: e.clientY - pos.y, lastX: e.clientX, lastY: e.clientY, lastT: e.timeStamp }
      el.style.cursor = "grabbing"
      if (!reduceMotion) schedule() // start writhing as soon as it is grabbed
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return
      e.stopPropagation()
      setPos({ x: e.clientX - drag.dx, y: e.clientY - drag.dy })
      if (!reduceMotion) {
        const dt = Math.max(1, e.timeStamp - drag.lastT)
        const vx = (e.clientX - drag.lastX) / dt // px per ms
        targetAngle = Math.max(-MAX_TILT, Math.min(MAX_TILT, vx * 9))
        speed = speed * 0.6 + (Math.hypot(e.clientX - drag.lastX, e.clientY - drag.lastY) / dt) * 0.4
      }
      drag.lastX = e.clientX
      drag.lastY = e.clientY
      drag.lastT = e.timeStamp
      if (reduceMotion) write()
      else schedule()
    }
    const endDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.pointerId) return
      e.stopPropagation()
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      drag = null
      targetAngle = 0
      el.style.cursor = "grab"
      if (reduceMotion) write()
      else {
        angularVel += angle * -0.15 // a little extra swing on release
        widthVel += (baseWidth - curWidth) * 0.3 // and a jelly snap back to full width
        speed = 0
        schedule()
      }
    }
    // Keep the drag from reaching other app handlers (e.g. Modal click-outside,
    // graph panning) via the compatibility mouse/touch/click events.
    const swallow = (e: Event) => e.stopPropagation()
    const preventNative = (e: Event) => e.preventDefault()
    const onResize = () => {
      setPos(pos)
      write()
    }

    el.addEventListener("pointerdown", onPointerDown)
    el.addEventListener("pointermove", onPointerMove)
    el.addEventListener("pointerup", endDrag)
    el.addEventListener("pointercancel", endDrag)
    el.addEventListener("lostpointercapture", endDrag)
    el.addEventListener("dragstart", preventNative)
    el.addEventListener("selectstart", preventNative)
    for (const type of ["mousedown", "mouseup", "click", "dblclick", "touchstart", "contextmenu"]) {
      el.addEventListener(type, swallow)
    }
    window.addEventListener("resize", onResize)

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      entrance?.cancel()
      if (drag && el.hasPointerCapture(drag.pointerId)) el.releasePointerCapture(drag.pointerId)
      el.removeEventListener("pointerdown", onPointerDown)
      el.removeEventListener("pointermove", onPointerMove)
      el.removeEventListener("pointerup", endDrag)
      el.removeEventListener("pointercancel", endDrag)
      el.removeEventListener("lostpointercapture", endDrag)
      el.removeEventListener("dragstart", preventNative)
      el.removeEventListener("selectstart", preventNative)
      for (const type of ["mousedown", "mouseup", "click", "dblclick", "touchstart", "contextmenu"]) {
        el.removeEventListener(type, swallow)
      }
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <div
      ref={elRef}
      role="img"
      aria-label="God of Configuration & Governance Pain"
      data-agent="governance-pain-deity"
      draggable={false}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width,
        zIndex: 990, // above the app, below modals
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        transformOrigin: "50% 20%",
        willChange: "transform",
      }}
    >
      <div style={{ filter: "drop-shadow(0 10px 24px rgba(0, 0, 0, 0.35))", pointerEvents: "none" }}>
        <AiProcessCanvas height={CANVAS_HEIGHT} />
      </div>
    </div>
  )
}
