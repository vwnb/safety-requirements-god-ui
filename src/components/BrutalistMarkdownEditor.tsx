import { marked } from "marked"
import { useMemo } from "react"

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    height: "400px",
    border: "2px solid black",
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
  },

  preview: {
    padding: "12px",
    fontFamily: "monospace",
    fontSize: "14px",
    overflow: "auto",
    background: "#f8f8f8",
    color: "#000",
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