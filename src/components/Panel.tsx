import type { CSSProperties, ReactNode, Ref } from "react"

// The brutalist frame shared by modals and the AI loaders, so every panel has
// the same border, corner radius, padding and surface colour.
export default function Panel({
  children,
  className,
  style,
  ref,
  dataAgent,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  ref?: Ref<HTMLDivElement>
  dataAgent?: string
}) {
  return (
    <div
      ref={ref}
      data-agent={dataAgent}
      className={className ? `brutal-panel ${className}` : "brutal-panel"}
      style={style}
    >
      {children}
    </div>
  )
}
