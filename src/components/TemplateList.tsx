import { brutal, type WorkItem, type TemplateManifest } from "../App"
import { SemanticColor } from "../lib/SemanticColor"
import { InfoButton } from "./InfoButton"

type TemplateItem = WorkItem & { templateManifest?: TemplateManifest }

export default function TemplateList({
  templates,
  filteredTemplates,
  filterText,
  onFilterTextChange,
  templateSearchMode,
  onTemplateSearchModeChange,
  templateSearchLoading,
  templateSearchError,
  onSearchTemplatesWithPrompt,
  onImportConceptsFromTemplate,
  activeRevisionId,
  onPendingConfirm,
}: {
  templates: TemplateItem[] | undefined
  filteredTemplates: TemplateItem[]
  filterText: string
  onFilterTextChange: (value: string) => void
  templateSearchMode: "browse" | "prompt"
  onTemplateSearchModeChange: (mode: "browse" | "prompt") => void
  templateSearchLoading: boolean
  templateSearchError: string | null
  onSearchTemplatesWithPrompt: () => void
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  onTemplateSearchModeChange("browse")
                }}
                style={{
                  ...brutal.button,
                  margin: 0,
                  ...(templateSearchMode === "browse" ? brutal.active : {})
                }}
              >
                Browse
              </button>
              <button
                type="button"
                onClick={() => {
                  onTemplateSearchModeChange("prompt")
                }}
                style={{
                  ...brutal.button,
                  margin: 0,
                  ...(templateSearchMode === "prompt" ? brutal.active : {})
                }}
              >
                Prompt search
              </button>
            </div>
            <input
              aria-label={templateSearchMode === "prompt" ? "Search templates with a prompt" : "Search templates"}
              placeholder={templateSearchMode === "prompt"
                ? "Try: hazard and risk analysis of a robotic kitten system"
                : "Search templates, tags, concepts, phases, standards..."
              }
              style={brutal.input}
              value={filterText}
              onChange={(e) => onFilterTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (templateSearchMode === "prompt" && e.key === "Enter") {
                  e.preventDefault()
                  onSearchTemplatesWithPrompt()
                }
              }}
            />
            {templateSearchMode === "prompt" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={onSearchTemplatesWithPrompt}
                  style={{ ...brutal.button, margin: 0 }}
                  disabled={templateSearchLoading}
                >
                  {templateSearchLoading ? "Searching..." : "Search"}
                </button>
                <span style={{ fontSize: 12, fontFamily: "monospace" }}>
                  Note: Prompt mode consumes LLM calls.
                </span>
              </div>
            )}
          </div>

          {templateSearchError && (
            <p style={{ color: "#b42318", marginBottom: 12 }}>{templateSearchError}</p>
          )}

          {filteredTemplates.length === 0 ? (
            <p>{templateSearchMode === "prompt" ? "No prompt matches yet." : "No matching templates."}</p>
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
                        <div className="list-tooltip" style={{ marginTop: 6 }}>{wi.description ?? "No description :("}</div>
                      </div>
                      {manifest && manifest.tags && manifest.tags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(manifest.tags ?? []).map((tag) => (
                            <span key={tag} style={{ ...brutal.tag, backgroundColor: SemanticColor.ARGUMENT }}>{tag}</span>
                          ))}
                        </div>
                      )}
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
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <strong>Phases:</strong>
                            {(manifest.phases ?? []).map((phase) => (
                              <span key={phase} style={{ ...brutal.tag, backgroundColor: SemanticColor.STRUCTURE }}>{phase}</span>
                            ))}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <strong>Concepts:</strong>
                            {(manifest.requiredConcepts ?? []).map((concept) => (
                              <span key={concept} style={{ ...brutal.tag, backgroundColor: SemanticColor.FUNCTIONAL }}>{concept}</span>
                            ))}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                            <strong>Relations:</strong>
                            {(manifest.relationPatterns ?? []).map((relation) => (
                              <span key={relation} style={{ ...brutal.tag, backgroundColor: SemanticColor.PROCESS }}>{relation}</span>
                            ))}
                          </div>
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