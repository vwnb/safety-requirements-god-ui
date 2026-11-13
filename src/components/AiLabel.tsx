import aiIcon from "../assets/eu-ai-icons/ai.svg"
import aiGeneratedIcon from "../assets/eu-ai-icons/ai-generated.svg"
import aiModifiedIcon from "../assets/eu-ai-icons/ai-modified.svg"

// EU icons for labelling AI-generated content (AI Act Art. 50, Code of Practice
// on marking and labelling). Source: digital-strategy.ec.europa.eu, free to use.
// - generated: content fully written by AI (e.g. refinement suggestions)
// - basic:     AI was involved (e.g. AI-planned query steps); pair with `text`
// - modified:  human content partially modified by AI
export type AiLabelVariant = "generated" | "basic" | "modified"

const ICONS: Record<AiLabelVariant, { src: string; aspect: number; alt: string }> = {
  generated: { src: aiGeneratedIcon, aspect: 1789.84 / 566.93, alt: "AI-generated content" },
  basic: { src: aiIcon, aspect: 1, alt: "AI was used to create this content" },
  modified: { src: aiModifiedIcon, aspect: 1700.79 / 566.93, alt: "Content modified with AI" },
}

type AiLabelProps = {
  variant?: AiLabelVariant
  /** Optional plain-language text shown next to the icon. */
  text?: string
  /** Icon height in px. */
  height?: number
}

export default function AiLabel({ variant = "generated", text, height = 36 }: AiLabelProps) {
  const icon = ICONS[variant]
  return (
    <span
      data-agent={`ai-label-${variant}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        verticalAlign: "middle",
        fontSize: 13,
        lineHeight: 1.2,
      }}
    >
      <img
        src={icon.src}
        alt={text ? "" : icon.alt}
        aria-hidden={text ? true : undefined}
        height={height}
        width={Math.round(height * icon.aspect)}
        style={{ display: "block", flexShrink: 0 }}
      />
      {text && <span>{text}</span>}
    </span>
  )
}
