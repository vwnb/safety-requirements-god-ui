

const TOUR_STORAGE_KEY = "seen-onboarding-tour-2"

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

type TourStep = {
  selector: string
  title: string
  body: string
  placement?: "top" | "bottom" | "left" | "right"
}

const steps: TourStep[] = [
  {
    selector: "graph-view",
    title: "⁉️ Live traceability graph",
    body:
      "Visualize relationships between hazards, safety goals, requirements, revisions, and evidence. Engineers can immediately inspect traceability gaps, impact chains, and downstream compliance effects during safety analysis.",
    placement: "left",
  },

  {
    selector: "revisions-section",
    title: "🔭 Revision-aware compliance workflow",
    body:
      "Every concept evolves through tracked revisions. Teams can compare baselines, inspect deltas, and maintain audit-ready change history required for safety-critical development processes.",
    placement: "bottom",
  },

  {
    selector: "import-concepts-section",
    title: "🤯 Kinda like Lego for safety",
    body:
      "Import reusable concept structures for common automotive systems and safety patterns. This reduces duplicated work and standardizes ISO 26262 process adoption across projects and product lines.",
    placement: "bottom",
  },

  {
    selector: "werk-that-llm-section",
    title: "🧯 AI-assisted ISO 26262 generation",
    body:
      "Generate hazards, safety goals, requirements, and traceability links via prompt. Evaluate and go audit-ready.",
    placement: "top",
  },

]

// ----------------------------------------------------
// DOM
// ----------------------------------------------------

let overlay: HTMLDivElement | null = null
let hole: HTMLDivElement | null = null
let tooltip: HTMLDivElement | null = null

let currentStep = 0

function qs(selector: string): HTMLElement | null {
  return document.querySelector(`[data-agent="${selector}"]`)
}

// ----------------------------------------------------
// Create overlay
// ----------------------------------------------------

function createUI() {
  if (overlay) return

  overlay = document.createElement("div")

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(52, 210, 218, 0.16)",
    zIndex: "999999",
    pointerEvents: "none",
    transition: "all 220ms ease",
  })

  hole = document.createElement("div")

  Object.assign(hole.style, {
    position: "fixed",
    borderRadius: "4px",
    boxShadow: `
      0 0 0 9999px rgba(0,0,0,0.55),
      0 0 0 2px #fff,
      0 0 30px rgba(255,255,255,0.4)
    `,
    transition: "all 260ms cubic-bezier(.2,.8,.2,1)",
    zIndex: "1000000",
    pointerEvents: "none",
  })

  tooltip = document.createElement("div")

  Object.assign(tooltip.style, {
    position: "fixed",
    width: "360px",
    background: "#fff",
    color: "#111",
    borderRadius: "4px",
    padding: "18px",
    fontFamily: "monospace",
    zIndex: "1000001",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    transition: "all 240ms ease",
    pointerEvents: "auto",
    borderWidth: "2px",
    borderStyle: "solid",
    borderLeftWidth: "6px",
    margin: "8px 0",
    cursor: "pointer",
  })

  document.body.appendChild(overlay)
  document.body.appendChild(hole)
  document.body.appendChild(tooltip)
}

// ----------------------------------------------------
// Cleanup
// ----------------------------------------------------

function destroyUI() {
  overlay?.remove()
  hole?.remove()
  tooltip?.remove()

  overlay = null
  hole = null
  tooltip = null
}

// ----------------------------------------------------
// Positioning
// ----------------------------------------------------

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function positionTooltip(
  rect: DOMRect,
  placement: TourStep["placement"] = "bottom"
) {
  if (!tooltip) return

  const gap = 20
  const width = 360
  const height = 220

  let left = rect.left
  let top = rect.bottom + gap

  if (placement === "top") {
    top = rect.top - height - gap
  }

  if (placement === "left") {
    left = rect.left - width - gap
    top = rect.top
  }

  if (placement === "right") {
    left = rect.right + gap
    top = rect.top
  }

  left = clamp(left, 20, window.innerWidth - width - 20)
  top = clamp(top, 20, window.innerHeight - height - 20)

  tooltip.style.left = `${left}px`
  tooltip.style.top = `${top}px`
}

function scrollIntoViewInstant(el: HTMLElement) {
  const rect = el.getBoundingClientRect()

  const absoluteTop = rect.top + window.scrollY

  window.scrollTo({
    top: Math.max(absoluteTop - 120, 0),
    behavior: "instant" as ScrollBehavior,
  })
}

// ----------------------------------------------------
// Render step
// ----------------------------------------------------

async function renderStep(index: number) {
  currentStep = index

  const step = steps[index]
  const target = qs(step.selector)

  if (!target || !hole || !tooltip) {
    return
  }

  scrollIntoViewInstant(target)

  await sleep(350)

  const rect = target.getBoundingClientRect()

  Object.assign(hole.style, {
    left: `${rect.left - 10}px`,
    top: `${rect.top - 10}px`,
    width: `${rect.width + 20}px`,
    height: `${rect.height + 20}px`,
  })

  positionTooltip(rect, step.placement)

  tooltip.innerHTML = `
    <div style="font-size:18px;font-weight:700;margin-bottom:10px;">
      ${step.title}
    </div>

    <div style="line-height:1.55;font-size:14px;margin-bottom:18px;">
      ${step.body}
    </div>

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
    ">
      <div style="font-size:12px;opacity:0.6;">
        ${index + 1} / ${steps.length}
      </div>

      <div style="display:flex;gap:8px;">
        ${index > 0
      ? `<button id="tour-prev">Prev</button>`
      : ""
    }

        ${index < steps.length - 1
      ? `<button id="tour-next">Next</button>`
      : `<button id="tour-finish">Finish</button>`
    }
      </div>
    </div>
  `

  tooltip.querySelectorAll("button").forEach((btn) => {
    Object.assign((btn as HTMLButtonElement).style, {
      border: "none",
      color: "black",
      background: "white",
      padding: "8px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      fontWeight: "600",
      borderWidth: "2px",
      borderStyle: "solid",
      borderLeftWidth: "6px",
      margin: "8px 0",
      fontFamily: "monospace"
    })
  });

  const tourPrev = document.getElementById("tour-prev") as HTMLElement

  tourPrev && (tourPrev.onclick = () => {
    renderStep(currentStep - 1)
  })

  const tourNext = document.getElementById("tour-next") as HTMLElement

  tourNext && (tourNext.onclick = () => {
    renderStep(currentStep + 1)
  })

  function completeTour() {
    localStorage.setItem(TOUR_STORAGE_KEY, "true")
    destroyUI()
  }

  const tourFinish = document.getElementById("tour-finish") as HTMLElement

  tourFinish && (tourFinish.onclick = () => {
    completeTour()
    destroyUI()
  })
}

export async function runOnboardingTour() {
  const alreadySeen = localStorage.getItem(TOUR_STORAGE_KEY)

  if (alreadySeen === "true") {
    return
  }

  createUI()
  await renderStep(0)
}