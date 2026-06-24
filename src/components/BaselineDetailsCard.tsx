import { typeColor } from "../App"

export default function BaselineDetailsCard({
  baseline,
  onSelectRevision,
}: {
  baseline: any
  onSelectRevision: (revisionId: string, conceptId: string, markdown: string) => void
}) {
  if (!baseline) return null

  return (
    <div data-agent="baseline-details-card" className="card">
      <article>
        <div className="card-header-row">
          <h2>{baseline.name}</h2>
        </div>

        {baseline.workItems.map((wi: any) => (
          <div key={wi.workItem.id} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontFamily: "monospace", marginBottom: 8, fontSize: 14 }}>
              {wi.workItem.key} — {wi.workItem.name}
            </div>
            <div className="list-input">
              {wi.revisions.map((r: any) => (
                <div
                  key={r.id}
                  className="option"
                  onClick={() => {
                    onSelectRevision(r.id, r.concept.id, r.markdown)
                  }}
                >
                  <span style={{
                    display: "inline-block",
                    padding: "1px 8px",
                    border: "2px solid black",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    marginRight: 8,
                    lineHeight: 1.4,
                    background: typeColor[r.concept.type] || "#ccc",
                    color: "#000",
                    whiteSpace: "nowrap",
                  }}>
                    {r.concept.type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                  <div className="list-id">
                    {r.concept.key}
                  </div>
                  <div className="list-tooltip">
                    Revision {r.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </article>
    </div>
  )
}