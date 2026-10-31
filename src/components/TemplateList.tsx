import { brutal, type TemplateItem } from "../App"
import { SemanticColor } from "../lib/SemanticColor"
import { InfoButton } from "./InfoButton"

export default function TemplateList({
  templates,
  filteredTemplates,
  filterText,
  onFilterTextChange,
  onImportConceptsFromTemplate,
  activeRevisionId,
  onPendingConfirm,
}: {
  templates: TemplateItem[] | undefined
  filteredTemplates: TemplateItem[]
  filterText: string
  onFilterTextChange: (value: string) => void
  onImportConceptsFromTemplate: (workItemId: string) => void
  activeRevisionId: string | null
  onPendingConfirm: (confirm: { message: string; onConfirm: () => void } | null) => void
}) {
  return (
    <section data-agent="import-concepts-section">
      <div className="title" style={{ display: "flex", alignItems: "center" }}>
        Import work item templates
        <InfoButton
          title="Work item templates"
          content="Use Browse to filter locally loaded templates by manifest fields. Use Prompt search to send a natural-language request to the server and retrieve matching templates."
        />
      </div>
      {templates === undefined ? (
        <p>
          Loading templates...
        </p>
      ) : templates.length === 0 ? (
        <p>
          No templates yet.
        </p>
      ) : (
        <>
          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            <input
              aria-label="Search templates"
              placeholder="Filter by freetext"
              style={brutal.input}
              value={filterText}
              onChange={(e) => onFilterTextChange(e.target.value)}
            />
          </div>

          {filteredTemplates.length === 0 ? (
            <p>No matching templates.</p>
          ) : (
            <div className="list-input template-list">
              {filteredTemplates.map((wi) => {
                const manifest = wi.templateManifest
                return (
                  <div
                    className="option"
                    data-agent={`template-${wi.id}`}
                    key={wi.id}
                    onClick={() => {
                      const action = () => { onImportConceptsFromTemplate(wi.id) }
                      if (activeRevisionId) {
                        onPendingConfirm({
                          message: "You have an active revision in progress. Discard it and import concepts from template?",
                          onConfirm: action,
                        })
                      } else {
                        action()
                      }
                    }}
                    style={{ textAlign: "left", padding: 12 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 6, width: 300 }}>
                      <div className="template-info">
                        <div className="list-id">{wi.key} - {wi.name}</div>
                        {wi.thumbnail && (
                          <img
                            src={wi.thumbnail}
                            alt="Template thumbnail"
                            width={128}
                            height={128}
                            style={{ float: 'left', marginRight: "1em" }}
                          />
                        )}
                        <div className="list-tooltip" style={{ marginTop: 6 }}>{wi.description ?? "No description :("}</div>
                      </div>
                    </div>
                    {manifest && (
                      <div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {wi.standards && wi.standards.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              <strong>Standards:</strong>
                              {wi.standards.map((standard) => (
                                <span key={standard} style={{ ...brutal.tag, backgroundColor: SemanticColor.DOCUMENTATION }}>{standard}</span>
                              ))}
                            </div>
                          )}
                          {manifest.phases && manifest.phases.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                              <strong>Phases:</strong>
                              {manifest.phases.map((phase) => (
                                <span key={phase} style={{ ...brutal.tag, backgroundColor: SemanticColor.STRUCTURE }}>{phase}</span>
                              ))}
                            </div>
                          )}
                          {manifest && manifest.tags && manifest.tags.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              <strong>Tags:</strong>
                              {(manifest.tags ?? []).map((tag) => (
                                <span key={tag} style={{ ...brutal.tag, backgroundColor: SemanticColor.ARGUMENT }}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}