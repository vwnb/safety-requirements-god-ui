import { marked } from "marked"
import { useMemo } from "react"

type RelationWithCreatedBy = {
  id: string
  type: string
  fromId: string
  toId: string
  createdBy?: { name: string }
}

export function BrutalistMarkdownEditor({
  value,
  onChange,
  relations,
  allRevisions,
  conceptMap,
}: {
  value: string
  onChange: (v: string) => void
  relations?: RelationWithCreatedBy[]
  allRevisions?: { id: string; conceptId: string }[]
  conceptMap?: Map<string, { id: string; key: string }>
}) {
  const html = useMemo(() => marked.parse(value || ""), [value])

  return (
    <div>
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
              const fromRev = allRevisions?.find(r => r.id === rel.fromId)
              const toRev = allRevisions?.find(r => r.id === rel.toId)
              const fromConcept = fromRev ? conceptMap?.get(fromRev.conceptId) : null
              const toConcept = toRev ? conceptMap?.get(toRev.conceptId) : null
              return (
                <div
                  key={rel.id}
                  className="option2"
                  style={{ fontSize: 11, padding: "4px 8px", marginBottom: 2 }}
                >
                  <span style={{ fontWeight: "bold" }}>{rel.type}</span>
                  : {fromConcept?.key || rel.fromId.slice(0, 8)} → {toConcept?.key || rel.toId.slice(0, 8)}
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
    </div>
  )
}