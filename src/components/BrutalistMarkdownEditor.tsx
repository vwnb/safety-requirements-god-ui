import { marked } from "marked"
import { useMemo } from "react"

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    height: "400px",
    border: "2px solid black",
    minHeight: 0,
  },

  editor: {
    all: "unset",
    padding: "12px",
    fontFamily: "monospace",
    fontSize: "14px",
    borderRight: "2px solid black",
    overflow: "auto",
    whiteSpace: "pre",
    background: "#fff",
    color: "#000",
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    resize: "none",
    minWidth: 0,
  },

  preview: {
    padding: "12px",
    fontFamily: "monospace",
    fontSize: "14px",
    overflow: "auto",
    background: "#f8f8f8",
    color: "#000",
    minWidth: 0,
    minHeight: 0,
  },
}

type Props = {
  value: string
  onChange: (v: string) => void
}

export default function BrutalistMarkdownEditor({ value, onChange }: Props) {
  const html = useMemo(() => {
    return marked.parse(value || "")
  }, [value])

  return (
    <div style={styles.container}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.editor}
        spellCheck={false}
      />

      <div
        style={styles.preview}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}