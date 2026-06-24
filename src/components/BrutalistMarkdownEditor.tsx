import { marked } from "marked"
import { useMemo } from "react"

type RelationWithCreatedBy = {
  id: string
  type: string
  fromId: string
  toId: string
  fromConceptKey?: string
  toConceptKey?: string
  createdBy?: { name: string }
}

export function BrutalistMarkdownEditor({
  value,
  onChange,
  relations,
}: {
  value: string
  onChange: (v: string) => void
  relations?: RelationWithCreatedBy[]
}) {
  const html = useMemo(() => marked.parse(value || ""), [value])

  return (
    <>
      <div
        data-agent="markdown-editor"
        style={{
          display: "grid",
          background: "white",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          height: 300,
          border: "2px solid black",
          minHeight: 0,
          flexGrow: 1
        }}
      >
        <textarea
          data-agent="markdown-editor-textarea"
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
          data-agent="markdown-editor-preview"
          style={{
            padding: 12,
            fontFamily: "sans-serif",
            overflow: "auto",
            minWidth: 0,
            minHeight: 0,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {relations && relations.length > 0 && (
        <div data-agent="editor-relations" style={{ marginTop: 8 }}>
          <div className="title" style={{ fontSize: 13, marginBottom: 4 }}>Relations</div>
          <div className="list-input">
            {relations.map((rel) => {
              const fromLabel = rel.fromConceptKey ?? rel.fromId.slice(0, 8)
              const toLabel = rel.toConceptKey ?? rel.toId.slice(0, 8)
              return (
                <div
                  key={rel.id}
                  className="option2"
                  style={{ fontSize: 11, padding: "4px 8px", marginBottom: 2, cursor: "default" }}
                >
                  <span style={{ fontWeight: "bold" }}>{rel.type}</span>
                  : {fromLabel} → {toLabel}
                  {rel.createdBy?.name && (
                    <span style={{ opacity: 0.6, marginLeft: 8 }}>
                      (by {rel.createdBy.name})
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}