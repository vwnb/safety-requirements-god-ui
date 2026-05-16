import { marked } from "marked"
import { useMemo } from "react"

export function BrutalistMarkdownEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const html = useMemo(() => marked.parse(value || ""), [value])

  return (
    <div
      style={{
        display: "grid",
        background: "white",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        height: 300,
        border: "2px solid black",
        minHeight: 0,
      }}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          all: "unset",
          padding: 12,
          fontFamily: "monospace",
          borderRight: "2px solid black",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          overflow: "auto",
          resize: "none",
          minWidth: 0,
        }}
      />

      <div
        style={{
          padding: 12,
          fontFamily: "monospace",
          overflow: "auto",
          minWidth: 0,
          minHeight: 0,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}