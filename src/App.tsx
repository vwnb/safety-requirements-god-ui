import logo from "./assets/logo.png"
import { useAuth0 } from "@auth0/auth0-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Diff, Hunk, parseDiff, type HunkData } from "react-diff-view"
import "react-diff-view/style/index.css"
import { diffLines, formatLines } from "unidiff"
import { marked } from "marked"
import GraphView from "./components/GraphView"
import { useApiFetch } from "./lib/apiFetchContext"

const API = import.meta.env.VITE_API_URL || ""

type LifecyclePhase = "ITEM_DEFINITION" | "HARA" | "FUNCTIONAL_SAFETY" | "TECHNICAL_SAFETY" | "SYSTEM_DESIGN" | "SOFTWARE_DESIGN" | "IMPLEMENTATION" | "VERIFICATION" | "VALIDATION" | "PRODUCTION" | "OPERATION" | "DECOMMISSIONING"

type ASIL = "QM" | "A" | "B" | "C" | "D"

type Concept = {
  id: string
  key: string
  type: string
  title: string
  phase?: LifecyclePhase
  asil?: ASIL
}

export const typeColor: Record<string, string> = {
  ITEM: "#c9dbf0",
  HAZARD: "#eecccc",
  SAFETY_GOAL: "#f3e1c3",
  FSR: "#b2ebc7",
  TSR: "#a9e0ea",
  SOFTWARE_REQUIREMENT: "#d4caf0",
  ASSUMPTION: "#eccee4",
  CONSTRAINT: "#ace8e1",
  TEST_CASE: "#eee8ad",
}

type Revision = {
  id: string
  conceptId: string
  markdown: string
  createdBy: string
}

type WorkItem = {
  id: string
  key: string
  name: string
  description?: string
  createdBy: string
  createdAt: string
  phase?: LifecyclePhase
  asil?: ASIL
  applicationContext?: string
  systemBoundary?: string
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
    fontSize: 14,
    marginBottom: "1em",
    marginTop: "1em",
  },
  button: {
    all: "unset" as any,
    color: "black",
    background: "white",
    borderWidth: "2px",
    borderStyle: "solid",
    padding: "4px 8px",
    cursor: "pointer",
    fontFamily: "monospace",
    boxSizing: "border-box" as const,
  },
  active: {
    background: "white",
    borderColor: "white"
  },
  input: {
    all: "unset" as any,
    background: "white",
    border: "2px solid black",
    padding: "6px",
    fontFamily: "monospace",
    width: "100%",
    boxSizing: "border-box" as const,
  },

  select: {
    all: "unset" as any,
    background: "white",
    border: "2px solid black",
    padding: "6px",
    fontFamily: "monospace",
    width: "100%",
    boxSizing: "border-box" as const,
    cursor: "pointer",
  },

  list: {
    border: "2px solid black",
    background: "white",
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
    padding: "0 6px",
  },

  actions: {
    display: "flex",
    gap: "4px",
  },

  formRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: 6,
  },

  label: {
    width: "150px",
    marginRight: 10,
    color: "black",
  },
}

function Auth0UserBar({
  onActorResolved,
}: {
  onActorResolved: (sub: string) => void
}) {
  const { isAuthenticated, user, loginWithRedirect, logout, isLoading } = useAuth0()

  useEffect(() => {
    if (isAuthenticated && user?.sub) onActorResolved(user.sub)
    else onActorResolved("")
  }, [isAuthenticated, user, onActorResolved])

  return (
    <div>
      {isLoading ? (
        <div style={{ ...brutal.input, opacity: 0.7 }}>Auth…</div>
      ) : isAuthenticated ? (
        <>
          <div
            style={{
              ...brutal.input,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              minHeight: 36,
            }}
          >
            {user?.email || user?.name || user?.sub || "Signed in"}
          </div>
          <button
            type="button"
            style={brutal.button}
            onClick={() =>
              logout({
                logoutParams: { returnTo: window.location.origin },
              })
            }
          >
            Log out
          </button>
        </>
      ) : (
        <button type="button" style={brutal.button} onClick={() => loginWithRedirect()}>
          Log in
        </button>
      )}
    </div>
  )
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

export default function App({ auth0Enabled }: { auth0Enabled: boolean }) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [selectedWorkItem, setSelectedWorkItem] = useState<string>("")
  const [selectedWorkItemData, setSelectedWorkItemData] = useState<WorkItem | null>(null)

  const [concepts, setConcepts] = useState<Concept[]>([])
  const [selectedConcept, setSelectedConcept] = useState<string>("")
  const [activeConcept, setActiveConcept] = useState<Concept | null>(null)

  const [revisionsByConcept, setRevisionsByConcept] =
    useState<Record<string, Revision[]>>({})

  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null)
  const [editorValue, setEditorValue] = useState("")
  const apiFetch = useApiFetch()
  const [authSub, setAuthSub] = useState("")
  const onActorResolved = useCallback((sub: string) => {
    setAuthSub(sub)
  }, [])
  const actorForApi = auth0Enabled ? authSub : "Alice"
  const { user } = useAuth0()

  const [baselineName, setBaselineName] = useState("")
  const [selectedRevisions, setSelectedRevisions] = useState<string[]>([])

  const [baseId, setBaseId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)

  const [{ hunks }, setDiff] = useState<{ hunks: HunkData[] }>({
    hunks: [],
  })

  const [newConceptKey, setNewConceptKey] = useState("")
  const [newConceptType, setNewConceptType] = useState("ITEM")
  const [newConceptTitle, setNewConceptTitle] = useState("")
  const [newConceptPhase, setNewConceptPhase] = useState("ITEM_DEFINITION")
  const [newConceptAsil, setNewConceptAsil] = useState("QM")

  const [editWorkItemName, setEditWorkItemName] = useState("")
  const [editWorkItemDescription, setEditWorkItemDescription] = useState("")
  const [editWorkItemPhase, setEditWorkItemPhase] = useState<LifecyclePhase | "">("")
  const [editWorkItemAsil, setEditWorkItemAsil] = useState<ASIL | "">("")
  const [editWorkItemApplicationContext, setEditWorkItemApplicationContext] = useState("")
  const [editWorkItemSystemBoundary, setEditWorkItemSystemBoundary] = useState("")

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
    async function init() {
      await withLoading("Loading work items...", async () => {
        try {
          const res = await apiFetch(`${API}/work-items`)
          const data = res.ok ? await res.json() : []

          setWorkItems(data)

          if (data.length > 0) {
            setSelectedWorkItem(data[0].id)
          } else {
            await loadConcepts()
          }
        } catch {
          await loadConcepts()
        }
      })

      refreshBaselines()
    }

    if (user) {
      init()
    }
  }, [user])

  useEffect(() => {
    if (!selectedWorkItem) return

    async function load() {
      await Promise.all([
        loadWorkItemDetails(selectedWorkItem),
        loadConcepts(selectedWorkItem),
        refreshGraph(selectedWorkItem),
      ])
    }

    load()
  }, [selectedWorkItem])

  useEffect(() => {
    if (selectedWorkItemData) {
      setEditWorkItemName(selectedWorkItemData.name || "")
      setEditWorkItemDescription(selectedWorkItemData.description || "")
      setEditWorkItemPhase(selectedWorkItemData.phase || "")
      setEditWorkItemAsil(selectedWorkItemData.asil || "")
      setEditWorkItemApplicationContext(selectedWorkItemData.applicationContext || "")
      setEditWorkItemSystemBoundary(selectedWorkItemData.systemBoundary || "")
    }
  }, [selectedWorkItemData])

  useEffect(() => {
    if (selectedConcept) {
      const concept = concepts.find(c => c.id === selectedConcept)
      setActiveConcept(concept || null)
    }
  }, [selectedConcept])

  async function loadConcepts(workItemId?: string) {
    return withLoading("Loading concepts...", async () => {
      const url = workItemId
        ? `${API}/work-items/${workItemId}/concepts`
        : `${API}/concepts`

      const res = await apiFetch(url)
      const data = await res.json()

      setConcepts(data)

      if (data.length > 0) {
        setSelectedConcept(data[0].id)

        const revisions = await loadRevisions(data[0].id)

        const latest = revisions.at(-1)

        if (latest) {
          setActiveRevisionId(latest.id)
          setEditorValue(latest.markdown)
        }
      } else {
        setSelectedConcept("")
        setEditorValue("")
      }
    })
  }

  async function loadRevisions(conceptId: string) {
    return withLoading("Loading revisions...", async () => {
      const res = await apiFetch(`${API}/concepts/${conceptId}/revisions`)
      const data = await res.json()

      setRevisionsByConcept((prev) => ({
        ...prev,
        [conceptId]: data,
      }))

      setActiveRevisionId(data[data.length - 1]?.id || null)

      return data
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
    await apiFetch(`${API}/workflow/submit-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conceptId: selectedConcept,
        markdown: editorValue,
        user: actorForApi,
      }),
    })

    const revisions = await loadRevisions(selectedConcept)

    const latest = revisions.at(-1)

    if (latest) {
      setActiveRevisionId(latest.id)
      setEditorValue(latest.markdown)
    }

    await refreshGraph(selectedWorkItem)
  }

  function toggleRevision(id: string) {
    setSelectedRevisions((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    )
  }

  async function createBaseline() {
    await apiFetch(`${API}/baselines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: baselineName,
        revisions: selectedRevisions,
        user: actorForApi,
      }),
    })

    refreshBaselines()
    setSelectedRevisions([])
    setBaselineName("")
  }

  async function createConcept() {
    if (!newConceptKey.trim()) return

    const url = selectedWorkItem
      ? `${API}/work-items/${selectedWorkItem}/concepts`
      : `${API}/concepts`

    const res = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: newConceptKey,
        type: newConceptType,
        title: newConceptTitle,
        phase: newConceptPhase,
        asil: newConceptAsil,
      }),
    })

    const created = await res.json()

    setConcepts((prev) => [...prev, created])
    setSelectedConcept(created.id)
    setNewConceptKey("")
    setNewConceptTitle("")
    setNewConceptPhase("")
    setNewConceptAsil("QM")

    await loadRevisions(created.id)
    await refreshGraph(selectedWorkItem)
  }

  async function loadWorkItemDetails(workItemId: string) {
    const res = await apiFetch(
      `${API}/work-items/${workItemId}`
    )

    const data = await res.json()

    setSelectedWorkItemData(data)
  }

  async function saveWorkItem() {
    if (!selectedWorkItemData) return

    await apiFetch(`${API}/work-items/${selectedWorkItemData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editWorkItemName,
        description: editWorkItemDescription,
        phase: editWorkItemPhase,
        asil: editWorkItemAsil,
        applicationContext: editWorkItemApplicationContext,
        systemBoundary: editWorkItemSystemBoundary,
      }),
    })

    await loadWorkItemDetails(selectedWorkItemData.id)

    setWorkItems((prev) =>
      prev.map((wi) =>
        wi.id === selectedWorkItemData.id
          ? { ...wi, name: editWorkItemName, description: editWorkItemDescription }
          : wi
      )
    )
  }

  async function refreshGraph(workItemId: string) {
    const data = await apiFetch(`${API}/graph/${workItemId}`).then((r) => r.json())
    setGraph(data)
  }

  async function importConceptsFromWorkItem(workItemId: string) {
    setLoading(true)
    setLoadingMessage("Importing concepts from work item...")

    const res = await apiFetch(`${API}/graph/${workItemId}`)
    const { concepts, relations } = await res.json()

    await apiFetch(`${API}/work-items/${selectedWorkItem}/graph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concepts, relations }),
    })

    setLoading(false)
    refreshGraph(selectedWorkItem)
    loadConcepts(selectedWorkItem)
  }

  async function refreshBaselines() {
    const data = await apiFetch(`${API}/baselines`).then((r) => r.json())
    setBaselines(data)
  }

  return (
    <>
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
      <div style={{ width: "720px", padding: 20, fontFamily: "monospace" }}>
        <div className="top-header">
          <img src={logo} alt="Logo" className="logo" />

          <section style={{ flex: 1 }}>
            <div style={brutal.title}>User</div>
            {auth0Enabled ? (
              <Auth0UserBar onActorResolved={onActorResolved} />
            ) : (
              <input
                value={"Alice"}
                style={brutal.input}
              />
            )}
          </section>

          {!!user && (

            <section style={{ flex: 1 }}>
              <div style={brutal.title}>Project</div>
              <input
                disabled
                value={"Mock project"}
                style={brutal.input}
              />
            </section>

          )}
        </div>

        {!!user && (

          <>

            <hr />

            <section>
              <div style={brutal.title}>Work items</div>

              {workItems.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <select
                    value={selectedWorkItem}
                    onChange={(e) => setSelectedWorkItem(e.target.value)}
                    style={{ ...brutal.select, marginBottom: 6 }}
                  >
                    {workItems.map((workItem) => (
                      <option key={workItem.id} value={workItem.id}>
                        {workItem.key} — {workItem.name}
                      </option>
                    ))}
                  </select>

                  {selectedWorkItemData && (
                    <div>
                      <div style={brutal.title}>Edit work item</div>
                      <div style={brutal.formRow}>
                        <div style={brutal.label}>Name</div>
                        <input
                          value={editWorkItemName}
                          onChange={(e) => setEditWorkItemName(e.target.value)}
                          style={brutal.input}
                        />
                      </div>
                      <div style={brutal.formRow}>
                        <div style={brutal.label}>Description</div>
                        <textarea
                          value={editWorkItemDescription}
                          onChange={(e) => setEditWorkItemDescription(e.target.value)}
                          style={{ ...brutal.input, height: 60 }}
                        />
                      </div>
                      <div style={brutal.formRow}>
                        <div style={brutal.label}>Phase</div>
                        <select
                          value={editWorkItemPhase}
                          onChange={(e) => setEditWorkItemPhase(e.target.value as LifecyclePhase | "")}
                          style={brutal.select}
                        >
                          <option value="">-- Select Phase --</option>
                          <option value="ITEM_DEFINITION">Item Definition</option>
                          <option value="HARA">HARA</option>
                          <option value="FUNCTIONAL_SAFETY">Functional Safety</option>
                          <option value="TECHNICAL_SAFETY">Technical Safety</option>
                          <option value="SYSTEM_DESIGN">System Design</option>
                          <option value="SOFTWARE_DESIGN">Software Design</option>
                          <option value="IMPLEMENTATION">Implementation</option>
                          <option value="VERIFICATION">Verification</option>
                        </select>
                      </div>
                      <div style={brutal.formRow}>
                        <div style={brutal.label}>ASIL</div>
                        <select
                          value={editWorkItemAsil}
                          onChange={(e) => setEditWorkItemAsil(e.target.value as ASIL | "")}
                          style={brutal.select}
                        >
                          <option value="">-- Select ASIL --</option>
                          <option value="QM">QM</option>
                          <option value="ASIL_A">ASIL_A</option>
                          <option value="ASIL_B">ASIL_B</option>
                          <option value="ASIL_C">ASIL_C</option>
                          <option value="ASIL_D">ASIL_D</option>
                        </select>
                      </div>
                      <div style={brutal.formRow}>
                        <div style={brutal.label}>Application Context</div>
                        <input
                          value={editWorkItemApplicationContext}
                          onChange={(e) => setEditWorkItemApplicationContext(e.target.value)}
                          style={brutal.input}
                        />
                      </div>
                      <div style={brutal.formRow}>
                        <div style={brutal.label}>System Boundary</div>
                        <input
                          value={editWorkItemSystemBoundary}
                          onChange={(e) => setEditWorkItemSystemBoundary(e.target.value)}
                          style={brutal.input}
                        />
                      </div>
                      <button style={brutal.button} onClick={saveWorkItem}>SAVE CHANGES</button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <hr />

            <div className="concepts-layout">
              <section>
                <div style={brutal.title}>Concepts</div>

                {concepts.length === 0 ? (
                  <>
                    No concepts for this work item.
                  </>
                ) : (
                  concepts.map((c) => (
                    <button
                      key={c.id}
                      onClick={async () => {
                        setSelectedConcept(c.id)

                        const revisions = await loadRevisions(c.id)

                        const latest = revisions.at(-1)

                        if (latest) {
                          setActiveRevisionId(latest.id)
                          setEditorValue(latest.markdown)
                        } else {
                          setActiveRevisionId(null)
                          setEditorValue(c.title ? `# ${c.title}` : "")
                        }
                      }}
                      style={{
                        ...brutal.button,
                        ...(selectedConcept === c.id ? brutal.active : {}),
                        display: "block",
                        width: "100%",
                        marginBottom: 4,
                        background: typeColor[c.type] || "#ccc",
                      } as React.CSSProperties}
                    >
                      {c.key} ({c.type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())})
                    </button>
                  ))
                )}
              </section>

              <div className="horizontal-divider" />

              <section>
                <div style={brutal.title}>New concept</div>

                <div style={brutal.formRow}>
                  <div style={brutal.label}>Key</div>
                  <input
                    placeholder="e.g. BRAKE_FAILURE"
                    value={newConceptKey}
                    onChange={(e) => setNewConceptKey(e.target.value)}
                    style={{ ...brutal.input, flex: 1 }}
                  />
                </div>

                <div style={brutal.formRow}>
                  <div style={brutal.label}>Title</div>
                  <input
                    placeholder="optional"
                    value={newConceptTitle}
                    onChange={(e) => setNewConceptTitle(e.target.value)}
                    style={{ ...brutal.input, flex: 1 }}
                  />
                </div>

                <div style={brutal.formRow}>
                  <div style={brutal.label}>Phase</div>
                  <select
                    value={newConceptPhase}
                    onChange={(e) => setNewConceptPhase(e.target.value)}
                    style={{ ...brutal.select, flex: 1 }}
                  >
                    <option value="">-- Select Phase --</option>
                    <option value="ITEM_DEFINITION">Item Definition</option>
                    <option value="HARA">HARA</option>
                    <option value="FUNCTIONAL_SAFETY">Functional Safety</option>
                    <option value="TECHNICAL_SAFETY">Technical Safety</option>
                    <option value="SYSTEM_DESIGN">System Design</option>
                    <option value="SOFTWARE_DESIGN">Software Design</option>
                    <option value="IMPLEMENTATION">Implementation</option>
                    <option value="VERIFICATION">Verification</option>
                  </select>
                </div>

                <div style={brutal.formRow}>
                  <div style={brutal.label}>ASIL</div>
                  <select
                    value={newConceptAsil}
                    onChange={(e) => setNewConceptAsil(e.target.value)}
                    style={{ ...brutal.select, flex: 1 }}
                  >
                    <option value="">-- Select ASIL --</option>
                    <option value="QM">QM</option>
                    <option value="ASIL_A">ASIL_A</option>
                    <option value="ASIL_B">ASIL_B</option>
                    <option value="ASIL_C">ASIL_C</option>
                    <option value="ASIL_D">ASIL_D</option>
                  </select>
                </div>

                <div style={brutal.formRow}>
                  <div style={brutal.label}>Type</div>
                  <select
                    value={newConceptType}
                    onChange={(e) => setNewConceptType(e.target.value)}
                    style={{ ...brutal.select, flex: 1 }}
                  >
                    <option value="">-- Select Type --</option>
                    <option value="ITEM">Item</option>
                    <option value="HAZARD">Hazard</option>
                    <option value="HARM">Harm</option>
                    <option value="SAFETY_GOAL">Safety goal</option>
                    <option value="FSR">Functional safety requirement</option>
                    <option value="TSR">Technical safety requirement</option>
                    <option value="SSR">Software safety requirement</option>
                    <option value="HARDWARE_REQUIREMENT">Hardware requirement</option>
                    <option value="SOFTWARE_REQUIREMENT">Software requirement</option>
                    <option value="ASSUMPTION">Assumption</option>
                    <option value="CONSTRAINT">Constraint</option>
                    <option value="TEST_CASE">Test case</option>
                    <option value="TEST_RESULT">Test result</option>
                    <option value="VERIFICATION_REPORT">Verification report</option>
                    <option value="VALIDATION_REPORT">Validation report</option>
                    <option value="SAFETY_CASE">Safety case</option>
                    <option value="SAFETY_MANUAL">Safety manual</option>
                    <option value="CHANGE_REQUEST">Change request</option>
                    <option value="ANOMALY">Anomaly</option>
                  </select>

                </div>

                <button onClick={createConcept} style={brutal.button}>
                  CREATE
                </button>

              </section>
            </div>

            <hr />

            <section>
              <div style={brutal.title}>Import concepts</div>

              <div style={brutal.list}>
                {workItems.map((wi) => (
                  <div style={{...brutal.row, ...{cursor: "pointer"}}} key={wi.id} onClick={async () => {
                    importConceptsFromWorkItem(wi.id)
                  }}>
                    {wi.key} - {wi.name}
                  </div>
                ))}
              </div>
            </section>

            <hr />

            <section>
              <div style={brutal.title}>Editor</div>

              {activeRevisionId && (
                <div style={{ fontFamily: "monospace", marginBottom: 8 }}>
                  Concept: {activeConcept && activeConcept.key + " " + activeConcept.title}

                  <br />

                  Revision: {activeRevisionId.slice(0, 6)}
                </div>
              )}

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
                            onClick={() => {
                              setActiveRevisionId(r.id)
                              setSelectedConcept(r.conceptId)
                              setEditorValue(r.markdown)
                            }}
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
                <div style={{ background: "white", border: "2px solid black", marginTop: "1em" }}>
                  <p style={{ margin: "1em", fontStyle: "italic" }}>
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
                </div>
              )}
            </section>

            <hr />

            <section>
              <div style={brutal.title}>Baselines</div>

              <hr />

              {baselines.length === 0 ? (
                <div style={{ fontStyle: "italic", color: "#666", marginBottom: 10 }}>
                  No baselines yet.
                </div>
              ) : (
                baselines.map((b) => (
                  <button
                    key={b.id}
                    onClick={async () => {
                      const full = await apiFetch(`${API}/baselines/${b.id}`).then((r) => r.json())
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
                        </div>
                      )
                    })}
                  </div>
                </section>
              </>
            )}
            <hr />

            <section>
              <div style={brutal.title}>New baseline</div>

              <input
                placeholder="Baseline name"
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
                            {r.id.slice(0, 6)} — {r.markdown.slice(0, 80)}{r.markdown.length > 80 ? "..." : ""}
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
          </>
        )}

      </div>

      {!!user && (
        <main>
          <GraphView
            revisions={graph.revisions}
            concepts={graph.concepts}
            relations={graph.relations}
            onRelationCreated={() => { refreshGraph(selectedWorkItem) }}
            API={API}
          />
        </main>
      )}
    </>
  )
}
