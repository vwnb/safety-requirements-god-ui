import logo from "./assets/logo.png"
import { useEffect, useMemo, useState } from "react"
import { Diff, Hunk, parseDiff, type HunkData } from "react-diff-view"
import "react-diff-view/style/index.css"
import { diffLines, formatLines } from "unidiff"
import { marked } from "marked"
import GraphView from "./components/GraphView"

const API = import.meta.env.VITE_API_URL || ""

type Concept = {
  id: string
  key: string
  type: string
}

type Revision = {
  id: string
  conceptId: string
  markdown: string
  createdBy: string
}

type Project = {
  id: string
  key: string
  name: string
  description: string
  createdBy: string
  createdAt: string
}

export const brutal = {
  box: {
    border: "2px solid black",
    padding: "12px",
    marginBottom: "16px",
    position: "relative" as const,
  },
  title: {
    fontFamily: "monospace",
    fontWeight: "bold",
    color: "#000",
    textAlign: "left" as const,
    fontSize: 28,
    marginBottom: "1em",
    marginTop: "1em",
  },
  button: {
    all: "unset" as any,
    borderWidth: "2px",
    borderStyle: "solid",
    padding: "4px 8px",
    cursor: "pointer",
    fontFamily: "monospace",
    boxSizing: "border-box" as const,
  },
  active: {
    background: "white",
    color: "black",
    borderColor: "white"
  },
  input: {
    all: "unset" as any,
    border: "2px solid black",
    padding: "6px",
    fontFamily: "monospace",
    width: "100%",
    boxSizing: "border-box" as const,
  },

  list: {
    border: "2px solid black",
    maxHeight: 240,
    overflow: "auto",
  },

  row: {
    borderBottom: "1px solid black",
    padding: "6px",
    fontFamily: "monospace",
    alignItems: "center",
    boxSizing: "border-box" as const,
    display: "flex",
  },

  rowBase: {
    background: "#000",
    color: "#fff",
  },

  rowTarget: {
    background: "#222",
    color: "#fff",
  },

  cellId: {
    fontSize: 11,
  },

  cellText: {
    fontSize: 12,
    opacity: 0.8,
    overflow: "hidden",
    whiteSpace: "nowrap" as const,
    textOverflow: "ellipsis",
    flexGrow: 1,
  },

  actions: {
    display: "flex",
    gap: "4px",
  },
}

function Editor({
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
        gridTemplateColumns: "1fr 1fr",
        height: 300,
        border: "2px solid black",
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
        }}
      />

      <div
        style={{ padding: 12, fontFamily: "monospace" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")

  const [concepts, setConcepts] = useState<Concept[]>([])
  const [selectedConcept, setSelectedConcept] = useState<string>("")

  const [revisionsByConcept, setRevisionsByConcept] =
    useState<Record<string, Revision[]>>({})

  const [editorValue, setEditorValue] = useState("")
  const [user, setUser] = useState("alice")

  const [baselineName, setBaselineName] = useState("")
  const [selectedRevisions, setSelectedRevisions] = useState<string[]>([])

  const [baseId, setBaseId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)

  const [{ hunks }, setDiff] = useState<{ hunks: HunkData[] }>({
    hunks: [],
  })

  const [newConceptKey, setNewConceptKey] = useState("")
  const [newConceptType, setNewConceptType] = useState("REQUIREMENT")

  const [graph, setGraph] = useState({
    concepts: [],
    revisions: [],
    relations: [],
  })

  const [baselines, setBaselines] = useState<any[]>([])
  const [selectedBaseline, setSelectedBaseline] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Loading...")

  async function withLoading<T>(message: string, fn: () => Promise<T>): Promise<T> {
    setLoading(true)
    setLoadingMessage(message)

    try {
      return await fn()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function initProjects() {
      await withLoading("Loading projects...", async () => {
        try {
          const res = await fetch(`${API}/projects`)
          const data = res.ok ? await res.json() : []
          setProjects(data)

          if (data.length > 0) {
            setSelectedProject(data[0].id)
          } else {
            await loadConcepts()
          }
        } catch {
          await loadConcepts()
        }
      })
    }

    initProjects()
  }, [])

  useEffect(() => {
    if (!selectedProject) return

    loadConcepts(selectedProject)
    refreshGraph(selectedProject)
  }, [selectedProject])

  async function loadConcepts(projectId?: string) {
    return withLoading("Loading concepts...", async () => {
      const url = projectId
        ? `${API}/projects/${projectId}/concepts`
        : `${API}/concepts`

      const res = await fetch(url)
      const data = await res.json()

      setConcepts(data)

      if (data.length > 0) {
        setSelectedConcept(data[0].id)
        await loadRevisions(data[0].id)
      } else {
        setSelectedConcept("")
        setEditorValue("")
      }
    })
  }

  async function loadRevisions(conceptId: string) {
    return withLoading("Loading revisions...", async () => {
      const res = await fetch(`${API}/concepts/${conceptId}/revisions`)
      const data = await res.json()

      setRevisionsByConcept((prev) => ({
        ...prev,
        [conceptId]: data,
      }))

      setEditorValue(data[data.length - 1]?.markdown || "")
    })
  }

  function getRevisionText(id: string) {
    return Object.values(revisionsByConcept)
      .flat()
      .find((r) => r.id === id)?.markdown || ""
  }

  useEffect(() => {
    if (!baseId || !targetId) return

    const oldText = getRevisionText(baseId)
    const newText = getRevisionText(targetId)

    const diffText = formatLines(diffLines(oldText, newText), {
      context: 3,
    })

    const [diff] = parseDiff(diffText, { nearbySequences: "zip" })

    setDiff({ hunks: diff?.hunks || [] })
  }, [baseId, targetId, revisionsByConcept])

  async function revise() {
    await fetch(`${API}/workflow/submit-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conceptId: selectedConcept,
        markdown: editorValue,
        user,
      }),
    })

    await loadRevisions(selectedConcept)
    await refreshGraph(selectedProject)
  }

  function toggleRevision(id: string) {
    setSelectedRevisions((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    )
  }

  async function createBaseline() {
    await fetch(`${API}/baselines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: baselineName,
        revisions: selectedRevisions,
        user,
      }),
    })

    refreshBaselines()
    setSelectedRevisions([])
    setBaselineName("")
  }

  async function createConcept() {
    if (!newConceptKey.trim()) return

    const url = selectedProject
      ? `${API}/projects/${selectedProject}/concepts`
      : `${API}/concepts`

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: newConceptKey,
        type: newConceptType,
      }),
    })

    const created = await res.json()

    setConcepts((prev) => [...prev, created])
    setSelectedConcept(created.id)
    setNewConceptKey("")

    await loadRevisions(created.id)
    await refreshGraph(selectedProject)
  }

  async function refreshGraph(projectId: string) {
    const data = await fetch(`${API}/graph/${projectId}`).then((r) => r.json())
    setGraph(data)
  }

  async function refreshBaselines() {
    const data = await fetch(`${API}/baselines`).then((r) => r.json())
    setBaselines(data)
  }

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,0.92)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              border: "2px solid black",
              background: "white",
              padding: 18,
              fontFamily: "monospace",
              fontSize: 16,
            }}
          >
            {loadingMessage}
          </div>
        </div>
      )}

      <img src={logo} alt="Logo" style={{ maxWidth: "100%", width: "500px", height: "auto" }} />

      <hr />

      <section>
        <div style={brutal.title}>User</div>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={brutal.input}
        />
      </section>

      <hr />

      <section>
        <div style={brutal.title}>Projects</div>

        {projects.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 6 }}>PROJECT</div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{ ...brutal.input, marginBottom: 6, cursor: "pointer" }}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.key} — {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <hr />

      <section>
        <div style={brutal.title}>Concepts</div>

        <div style={{ marginBottom: 6 }}>NEW CONCEPT</div>

        <input
          placeholder="KEY (e.g. BRAKE_FAILURE)"
          value={newConceptKey}
          onChange={(e) => setNewConceptKey(e.target.value)}
          style={{ ...brutal.input, marginBottom: 6 }}
        />

        <select
          value={newConceptType}
          onChange={(e) => setNewConceptType(e.target.value)}
          style={{
            ...brutal.input,
            marginBottom: 6,
            cursor: "pointer",
          }}
        >
          <option value="REQUIREMENT">REQUIREMENT</option>
          <option value="TEST">TEST</option>
          <option value="HAZARD">HAZARD</option>
          <option value="CONTROL">CONTROL</option>
          <option value="ASSUMPTION">ASSUMPTION</option>
          <option value="CONSTRAINT">CONSTRAINT</option>
        </select>

        <button onClick={createConcept} style={brutal.button}>
          CREATE
        </button>

        <hr />

        {concepts.length === 0 ? (
          <>
            No concepts for this project.
          </>
        ) : (
          concepts.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedConcept(c.id)
                loadRevisions(c.id)
              }}
              style={{
                ...brutal.button,
                ...(selectedConcept === c.id ? brutal.active : {}),
                display: "block",
                width: "100%",
                marginBottom: 4,
                textAlign: "left",
              } as React.CSSProperties}
            >
              {c.key} ({c.type})
            </button>
          ))
        )}
      </section>

      <hr />

      <section>
        <div style={brutal.title}>Graph</div>

        <div style={brutal.box}>
          <GraphView
            revisions={graph.revisions}
            concepts={graph.concepts}
            relations={graph.relations}
            onRelationCreated={() => { refreshGraph(selectedProject) }}
            API={API}
          />
        </div>
      </section>

      <hr />

      <section>
        <div style={brutal.title}>Editor</div>

        <Editor value={editorValue} onChange={setEditorValue} />

        <button onClick={revise} style={{ ...brutal.button, marginTop: 8 }}>
          SAVE REVISION
        </button>
      </section>

      <hr />

      <section>
        <div style={brutal.title}>Revisions</div>

        {(revisionsByConcept[selectedConcept] || []).length === 0 ? (
          <>
            <hr />
            No revisions for this concept.
          </>
        ) : (
          <div style={brutal.list}>
            {(revisionsByConcept[selectedConcept] || []).map((r) => {
              const isBase = r.id === baseId
              const isTarget = r.id === targetId

              return (
                <div
                  key={r.id}
                  style={{
                    ...brutal.row,
                    ...(isBase ? brutal.rowBase : {}),
                    ...(isTarget ? brutal.rowTarget : {}),
                  }}
                >
                  <div style={brutal.cellId}>{r.id.slice(0, 6)}</div>

                  <div style={brutal.cellText}>{r.markdown}</div>

                  <div style={brutal.actions}>
                    <button
                      onClick={() => setEditorValue(r.markdown)}
                      style={brutal.button}
                    >
                      LOAD
                    </button>

                    <div style={{
                      borderLeft: "2px solid black", margin: "0 1rem",
                      ...(isBase || isTarget ? { borderColor: "white" } : {})
                    }} />

                    <button
                      onClick={() => setBaseId(r.id)}
                      style={{
                        ...brutal.button,
                        ...(isBase ? brutal.active : {}),
                      }}
                    >
                      BASE
                    </button>

                    <button
                      onClick={() => setTargetId(r.id)}
                      style={{
                        ...brutal.button,
                        ...(isTarget ? brutal.active : {}),
                      }}
                    >
                      HEAD
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {baseId && targetId && hunks.length === 0 && (
          <div style={{ marginTop: "1em", marginBottom: "1em", fontStyle: "italic" }}>
            No differences between these revisions.
          </div>
        )}
        {baseId && targetId && hunks.length > 0 && (
          <>
            <p style={{ marginTop: "1em", marginBottom: "1em", fontStyle: "italic" }}>
              <code>{baseId.slice(0, 6)}</code>{" → "}
              <code>{targetId.slice(0, 6)}</code>
            </p>
            <Diff viewType="split" diffType="modify" hunks={hunks}>
              {(hunks) =>
                hunks.map((hunk) => (
                  <Hunk
                    key={`${hunk.oldStart}-${hunk.newStart}`}
                    hunk={hunk}
                  />
                ))
              }
            </Diff>
          </>
        )}
      </section>

      <hr />

      <section>
        <div style={brutal.title}>Baselines</div>

        {baselines.length === 0 ? (
          <div style={{ fontStyle: "italic", color: "#666", marginBottom: 10 }}>
            No baselines yet.
          </div>
        ) : (
          baselines.map((b) => (
            <button
              key={b.id}
              onClick={async () => {
                const full = await fetch(`${API}/baselines/${b.id}`).then((r) => r.json())
                setSelectedBaseline(full)
              }}
              style={{ ...brutal.button, display: "block", marginBottom: 4 }}
            >
              {b.name}
            </button>
          ))
        )}

      </section>

      {selectedBaseline && (
        <>
          < hr />
          <section>
            <div style={brutal.title}>
              Baseline: {selectedBaseline.name}
            </div>

            <div style={brutal.list}>
              {selectedBaseline.items.map((item: any) => {
                const r = item.revision

                return (
                  <div key={r.id} style={brutal.row}>
                    <div style={{ width: 120 }}>
                      {r.concept.key} ({r.concept.type})
                    </div>

                    <div style={brutal.cellText}>
                      {r.markdown.slice(0, 80)}
                    </div>

                    <button
                      style={brutal.button}
                      onClick={() => setEditorValue(r.markdown)}
                    >
                      LOAD
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
      <hr />

      <section>
        <div style={brutal.title}>Baseline Builder</div>

        <input
          placeholder="BASELINE NAME"
          value={baselineName}
          onChange={(e) => setBaselineName(e.target.value)}
          style={{ ...brutal.input, marginBottom: 8 }}
        />

        <hr />

        {Object.keys(revisionsByConcept).length === 0 ? (
          <>
            No revisions for this concept.
          </>
        ) : (
          <>
            <div style={brutal.list}>
              {Object.values(revisionsByConcept)
                .flat()
                .map((r) => {
                  const checked = selectedRevisions.includes(r.id)

                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRevision(r.id)}
                      style={{
                        padding: 6,
                        borderBottom: "1px solid black",
                        background: checked ? "black" : "white",
                        color: checked ? "white" : "black",
                        cursor: "pointer",
                      }}
                    >
                      {r.id.slice(0, 6)} — {r.markdown.slice(0, 40)}
                    </div>
                  )
                })}
            </div>

            <button
              onClick={createBaseline}
              style={{ ...brutal.button, marginTop: 8 }}
            >
              CREATE BASELINE
            </button>
          </>
        )}
      </section>

      <hr />

    </div>
  )
}
