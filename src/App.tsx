import logo from "./assets/logo.png"
import { useAuth0 } from "@auth0/auth0-react"
import { useCallback, useEffect, useState } from "react"
import { Diff, Hunk, parseDiff, type HunkData } from "react-diff-view"
import "react-diff-view/style/index.css"
import { diffLines, formatLines } from "unidiff"
import GraphView from "./components/GraphView"
import { OfflineBanner } from "./components/OfflineBanner"
import { useApiFetch } from "./lib/apiFetchContext"
import { BrutalistMarkdownEditor } from "./components/BrutalistMarkdownEditor"
import background from "./assets/background.jpg"

const API = import.meta.env.VITE_API_URL || ""

type Project = { id: string, key: string }

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

export const backgroundImage = background;

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
  createdAt: string
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
  button: {
    all: "unset" as any,
    color: "black",
    background: "white",
    borderWidth: "2px",
    borderStyle: "solid",
    borderLeftWidth: "6px",
    borderRadius: 4,
    padding: "8px 16px",
    margin: "8px 0",
    cursor: "pointer",
    fontFamily: "monospace",
    boxSizing: "border-box" as const,
  },
  active: {
    background: "white",
    borderColor: "#FF5A00",
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

  rowBase: {
    background: "#93a9c6",
    color: "#fff",
  },

  rowTarget: {
    background: "#9bd5a2",
    color: "#fff",
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
    <div data-agent="auth-section">
      {isLoading ? (
        <div data-agent="auth-loading" style={{ ...brutal.input, opacity: 0.7 }}>Auth…</div>
      ) : isAuthenticated ? (
        <>
          <div
            data-agent="auth-user-info"
            style={{
              ...brutal.input,
              display: "flex",
              alignItems: "center",
            }}
          >
            {user?.email || user?.name || user?.sub || "Signed in"}
          </div>
          <button
            data-agent="btn-logout"
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
        <button data-agent="btn-login" type="button" style={brutal.button} onClick={() => loginWithRedirect()}>
          Log in
        </button>
      )}
    </div>
  )
}

function scrollToEditor() {
  setTimeout(() => {
    const el = document.querySelector('[data-agent="editor-section"]')
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, 0)
}

export default function App({ auth0Enabled }: { auth0Enabled: boolean }) {

  const apiFetch = useApiFetch()
  const [authSub, setAuthSub] = useState("")
  const onActorResolved = useCallback((sub: string) => {
    setAuthSub(sub)
  }, [])
  const actorForApi = auth0Enabled ? authSub : "Alice"
  const { user } = useAuth0()

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<Project>()

  const [projectKey, setProjectKey] = useState("")

  const joinProject = async () => {
    if (!projectKey.trim()) {
      return
    }

    try {
      setLoading(true)
      setLoadingMessage("Joining project...")

      const res = await apiFetch(
        `${API}/projects/${encodeURIComponent(projectKey)}/users`,
        {
          method: "POST",
        }
      )

      if (!res.ok) {
        throw new Error("Failed to join project")
      }

      setLoadingMessage("Refreshing projects...")

      await refreshProjects()

      setProjectKey("")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMessage("")
    }
  }

  const refreshProjects = async () => {
    try {
      setLoading(true)
      setLoadingMessage("Loading projects...")

      const res = await apiFetch(`${API}/me/projects`)

      if (!res.ok) {
        throw new Error("Failed to load projects")
      }

      const data = await res.json()

      setProjects(data.map((userProject: any) => {
        return userProject.project
      }))

      if (data.length > 0) {
        setSelectedProject(data[0].project)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMessage("")
    }
  }

  useEffect(() => {
    if (!user) return

    refreshProjects()
  }, [user])

  // Use initialized as false to distinguish "never loaded" from "loaded but empty"
  const [workItems, setWorkItems] = useState<WorkItem[] | null>(null)
  const [workItemsInitialized, setWorkItemsInitialized] = useState(false)
  workItemsInitialized
  const [selectedWorkItem, setSelectedWorkItem] = useState<string>("")
  const [selectedWorkItemData, setSelectedWorkItemData] = useState<WorkItem | null>(null)

  const [templates, setTemplates] = useState<WorkItem[]>([])

  const [concepts, setConcepts] = useState<Concept[] | null>(null)
  const [conceptsInitialized, setConceptsInitialized] = useState(false)
  conceptsInitialized
  const [selectedConcept, setSelectedConcept] = useState<string>("")
  const [activeConcept, setActiveConcept] = useState<Concept | null>(null)

  const [revisionsByConcept, setRevisionsByConcept] =
    useState<Record<string, Revision[]>>({})

  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null)
  const [editorValue, setEditorValue] = useState("")

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

  const [editConceptType, setEditConceptType] = useState("ITEM")
  const [editConceptPhase, setEditConceptPhase] = useState("ITEM_DEFINITION")
  const [editConceptAsil, setEditConceptAsil] = useState("QM")
  const [editConceptTitle, setEditConceptTitle] = useState("")
  const [editConceptKey, setEditConceptKey] = useState("")

  const [newWorkItemKey, setNewWorkItemKey] = useState("")
  const [newWorkItemTitle, setNewWorkItemTitle] = useState("")

  const [editWorkItemName, setEditWorkItemName] = useState("")
  const [editWorkItemDescription, setEditWorkItemDescription] = useState("")
  const [editWorkItemPhase, setEditWorkItemPhase] = useState<LifecyclePhase | "">("")
  const [editWorkItemAsil, setEditWorkItemAsil] = useState<ASIL | "">("")
  const [editWorkItemApplicationContext, setEditWorkItemApplicationContext] = useState("")
  const [editWorkItemSystemBoundary, setEditWorkItemSystemBoundary] = useState("")

  const [graph, setGraph] = useState<any>(null)

  const [baselines, setBaselines] = useState<any[]>([])
  const [selectedBaseline, setSelectedBaseline] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Loading...")

  const [llmPrompt, setLlmPrompt] = useState("")

  async function withLoading<T>(message: string, fn: () => Promise<T>): Promise<T> {
    // Set loading before any async work to ensure overlay shows
    setLoading(true)
    setLoadingMessage(message)

    try {
      return await fn()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function loadWorkItems() {
      if (!selectedProject) {
        return;
      }

      try {
        const [wiRes, templatesRes] = await Promise.all([
          apiFetch(`${API}/projects/${selectedProject.id}/work-items`),
          apiFetch(`${API}/templates`),
        ])

        const wiData = wiRes.ok ? await wiRes.json() : []
        const templatesData = templatesRes.ok ? await templatesRes.json() : []

        setWorkItems(wiData)
        setTemplates(templatesData)
        setWorkItemsInitialized(true)

        if (wiData.length > 0) {
          setSelectedWorkItem(wiData[0].id)
        } else {
          await loadConcepts()
        }
      } catch {
        await loadConcepts()
      }
    }

    if (user) {
      loadWorkItems()
    }
  }, [selectedProject])

  useEffect(() => {
    if (!selectedWorkItem || !selectedProject) return

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
      const concept = (concepts ?? []).find(c => c.id === selectedConcept)
      setActiveConcept(concept || null)
      if (concept) {
        setEditConceptKey(concept.key)
        setEditConceptTitle(concept.title)
        setEditConceptType(concept.type)
        setEditConceptPhase(concept.phase || "")
        setEditConceptAsil(concept.asil || "")
      }
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
      setConceptsInitialized(true)

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
    const res = await apiFetch(`${API}/concepts/${conceptId}/revisions`)
    const data = await res.json()

    setRevisionsByConcept((prev) => ({
      ...prev,
      [conceptId]: data,
    }))

    setActiveRevisionId(data[data.length - 1]?.id || null)

    return data
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

  async function revise(revision?: Revision) {

    let body;
    if (revision) {
      body = revision
    } else {
      body = {
        conceptId: selectedConcept,
        markdown: editorValue,
        user: actorForApi,
      }
    }

    await apiFetch(`${API}/workflow/submit-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  async function saveConcept() {
    if (!selectedConcept) return

    await apiFetch(`${API}/concepts/${selectedConcept}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: editConceptKey,
        type: editConceptType,
        title: editConceptTitle,
        phase: editConceptPhase,
        asil: editConceptAsil,
      }),
    })

    await loadConcepts(selectedWorkItem)
  }

  async function createConcept(concept?: Concept) {
    if (!concept && !newConceptKey.trim()) return

    const url = selectedWorkItem
      ? `${API}/work-items/${selectedWorkItem}/concepts`
      : `${API}/concepts`

    let body;
    if (concept) {
      body = concept
    } else {
      body = {
        key: newConceptKey,
        type: newConceptType,
        title: newConceptTitle,
        phase: newConceptPhase,
        asil: newConceptAsil,
      }
    }

    const res = await apiFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const created = await res.json()

    setConcepts((prev) => [...(prev ?? []), created])
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
      (prev ?? []).map((wi: WorkItem) =>
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

  async function importConceptsFromTemplate(workItemId: string) {
    setLoading(true)
    setLoadingMessage("Importing concepts from template...")

    try {
      const res = await apiFetch(`${API}/graph/${workItemId}`)
      const { concepts: importedConcepts, relations: importedRelations } = await res.json()

      await apiFetch(`${API}/work-items/${selectedWorkItem}/graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concepts: importedConcepts, relations: importedRelations }),
      })

      await loadConcepts(selectedWorkItem)
      await refreshGraph(selectedWorkItem)
    } finally {
      setLoading(false)
    }
  }

  async function createWorkItem() {
    if (!newWorkItemKey.trim() || !selectedProject) return

    const res = await apiFetch(`${API}/work-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: newWorkItemKey,
        name: newWorkItemTitle,
        projectKey: selectedProject.key
      }),
    })

    if (!res.ok) return

    const created = await res.json()

    setWorkItems((prev) => [...(prev ?? []), created])
    setSelectedWorkItem(created.id)
    setNewWorkItemKey("")
    setNewWorkItemTitle("")
  }

  async function refreshBaselines() {
    const data = await apiFetch(`${API}/baselines`).then((r) => r.json())
    setBaselines(data)
  }

  const generateWithLLM = async () => {
    if (!selectedWorkItem) return

    setLoading(true)
    setLoadingMessage("Generating content with LLM...")

    try {
      const res = await apiFetch(`${API}/generate-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: llmPrompt,
          user: actorForApi,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate data")

      const data = await res.json()

      const keyToConceptId: Record<string, string> = Object.fromEntries(
        (concepts ?? []).map((c) => [c.key, c.id])
      )
      const revisionKeyToRevisionId: Record<string, string> = {}
      const createdRevisionByConceptId: Record<string, string> = {}

      setLoadingMessage("Saving generated concepts...")

      for (const concept of data.concepts ?? []) {
        if (!concept.key) continue

        const cres = await apiFetch(
          `${API}/work-items/${selectedWorkItem}/concepts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(concept),
          }
        )

        if (!cres.ok) {
          console.warn("Failed to create concept", concept)
          continue
        }

        const created = await cres.json()
        keyToConceptId[concept.key] = created.id
      }

      setLoadingMessage("Saving generated revisions...")

      for (const revision of data.revisions ?? []) {
        const conceptKey = revision.conceptKey ?? revision.key
        const conceptId = keyToConceptId[conceptKey]

        if (!conceptId) {
          console.warn("Skipping revision; unknown concept key", revision)
          continue
        }

        const rres = await apiFetch(`${API}/workflow/submit-change`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conceptId,
            markdown: revision.markdown,
            user: actorForApi,
          }),
        })

        if (!rres.ok) {
          console.warn("Failed to create revision", revision)
          continue
        }

        const createdRevision = await rres.json()

        createdRevisionByConceptId[conceptId] = createdRevision.id

        if (revision.key) {
          revisionKeyToRevisionId[revision.key] = createdRevision.id
        }
      }

      setLoadingMessage("Resolving latest revisions...")

      const conceptToLatestRevisionId: Record<string, string> = {
        ...createdRevisionByConceptId,
      }

      const graphRes = await apiFetch(`${API}/graph/${selectedWorkItem}`)

      if (graphRes.ok) {
        const graphData = await graphRes.json()

        for (const rev of graphData.revisions ?? []) {
          const existingId = conceptToLatestRevisionId[rev.conceptId]
          const existing = graphData.revisions.find((r: any) => r.id === existingId)

          if (
            !existing ||
            new Date(rev.createdAt).getTime() >
            new Date(existing.createdAt).getTime()
          ) {
            conceptToLatestRevisionId[rev.conceptId] = rev.id
          }
        }
      }

      setLoadingMessage("Saving generated relations...")

      for (const relation of data.relations ?? []) {
        const fromKey = relation.fromKey ?? relation.from
        const toKey = relation.toKey ?? relation.to

        const fromId = revisionKeyToRevisionId[fromKey]
        const toId = revisionKeyToRevisionId[toKey]

        if (!fromId || !toId) {
          console.warn("Skipping relation; unknown revision key", {
            relation,
            revisionKeyToRevisionId,
          })
          continue
        }

        await apiFetch(`${API}/relations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromId,
            toId,
            type: relation.type,
            rationale: relation.rationale,
            user: actorForApi,
          }),
        })
      }

      setLoadingMessage("Refreshing data...")
      setLlmPrompt("")

      await refreshGraph(selectedWorkItem)
      await loadConcepts(selectedWorkItem)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <OfflineBanner />
      {loading && (
        <div data-agent="loading-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(233, 237, 233, 0.5)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div data-agent="loading-message"
            style={{
              border: "2px solid black",
              background: "rgb(233, 237, 233)",
              padding: 18,
              fontFamily: "monospace",
              fontSize: 16,
            }}
          >
            {loadingMessage}
          </div>
        </div>
      )}
      <header data-agent="top-header" className="top-header">
        <img src={logo} alt="Logo" className="logo" data-agent="logo" />

        <section style={{ flex: 1 }} data-agent="user-section">
          <div className="title">User</div>
          {auth0Enabled ? (
            <Auth0UserBar onActorResolved={onActorResolved} />
          ) : (
            <input
              data-agent="input-user"
              value={"Alice"}
              style={brutal.input}
            />
          )}
        </section>
      </header>

      {!!user && (
        <>
          <hr />

          <aside>
            <div className="cms-layout">
              <section style={{ flex: 1 }} data-agent="project-section">
                <div className="title">Project</div>

                <select
                  value={selectedProject?.id ?? ""}
                  onChange={(e) => {
                    const project = projects.find(
                      (p) => p.id === e.target.value
                    )

                    if (project) {
                      setSelectedProject(project)
                    }
                  }}
                  style={brutal.select}
                  data-agent="select-project"
                >
                  <option value="">
                    Select project
                  </option>

                  {projects.map((project: Project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.key}
                    </option>
                  ))}
                </select>
              </section>
              <section style={{ flex: 1 }} data-agent="join-project-section">
                <div className="title">Join Project</div>

                <input
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  placeholder="COMMON-MEGA-PROJECT"
                  style={{
                    ...brutal.input,
                  }}
                />

                <button
                  onClick={joinProject}
                  style={brutal.button}
                >
                  Join
                </button>
              </section>
            </div>

            <hr />

            {workItems === null ? (
              <p>Loading work items...</p>
            ) :
              workItems.length === 0 ? (
                <p>
                  No work items yet.
                </p>
              ) :
                (
                  <>
                    <div className="cms-layout">
                      <section data-agent="work-items-section">
                        <div className="title">Work items</div>

                        {workItems.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div data-agent="work-items-list" className="list-input">
                              {workItems.map((workItem) => (
                                <div
                                  className="option"
                                  data-agent={`work-item-${workItem.id}`}
                                  key={workItem.id}
                                  onClick={() => setSelectedWorkItem(workItem.id)}
                                  style={{
                                    ...(selectedWorkItem === workItem.id ? { background: "#000", color: "#fff" } : {}),
                                    cursor: "pointer",
                                  }}
                                >
                                  {workItem.key} — {workItem.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </section>

                      <section data-agent="new-work-item-section">
                        <div className="title">New work item</div>

                        <div style={brutal.formRow}>
                          <div style={brutal.label}>Key</div>
                          <input
                            data-agent="input-new-work-item-key"
                            placeholder="e.g. MYPROJ-001"
                            value={newWorkItemKey}
                            onChange={(e) => setNewWorkItemKey(e.target.value)}
                            style={{ ...brutal.input, flex: 1 }}
                          />
                        </div>

                        <div style={brutal.formRow}>
                          <div style={brutal.label}>Title</div>
                          <input
                            data-agent="input-new-work-item-title"
                            placeholder="e.g. Brake-by-wire system"
                            value={newWorkItemTitle}
                            onChange={(e) => setNewWorkItemTitle(e.target.value)}
                            style={{ ...brutal.input, flex: 1 }}
                          />
                        </div>

                        <button data-agent="btn-create-work-item" onClick={createWorkItem} style={brutal.button}>
                          Create
                        </button>
                      </section>
                    </div>

                    <section>

                      <div data-agent="edit-work-item-form">
                        <div className="title">Edit work item</div>
                        <div style={brutal.formRow}>
                          <div style={brutal.label}>Name</div>
                          <input
                            data-agent="input-work-item-name"
                            value={editWorkItemName}
                            onChange={(e) => setEditWorkItemName(e.target.value)}
                            style={brutal.input}
                          />
                        </div>
                        <div style={brutal.formRow}>
                          <div style={brutal.label}>Description</div>
                          <textarea
                            data-agent="input-work-item-description"
                            value={editWorkItemDescription}
                            onChange={(e) => setEditWorkItemDescription(e.target.value)}
                            style={{ ...brutal.input, height: 60 }}
                          />
                        </div>
                        <div style={brutal.formRow}>
                          <div style={brutal.label}>Phase</div>
                          <select
                            data-agent="select-work-item-phase"
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
                            data-agent="select-work-item-asil"
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
                            data-agent="input-work-item-application-context"
                            value={editWorkItemApplicationContext}
                            onChange={(e) => setEditWorkItemApplicationContext(e.target.value)}
                            style={brutal.input}
                          />
                        </div>
                        <div style={brutal.formRow}>
                          <div style={brutal.label}>System Boundary</div>
                          <input
                            data-agent="input-work-item-system-boundary"
                            value={editWorkItemSystemBoundary}
                            onChange={(e) => setEditWorkItemSystemBoundary(e.target.value)}
                            style={brutal.input}
                          />
                        </div>
                        <button data-agent="btn-save-changes" style={brutal.button} onClick={saveWorkItem}>Save changes</button>
                      </div>

                    </section>
                  </>
                )}

            <hr />

            <div className="cms-layout">
              <section data-agent="concepts-section">
                <div className="title">Concepts</div>

                {concepts === null ? (
                  <p>Loading concepts...</p>
                ) :
                  concepts.length === 0 ? (
                    <p>
                      No concepts yet.
                    </p>
                  ) :
                    (
                      concepts.map((c) => (
                        <button
                          data-agent={`concept-${c.id}`}
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

                            scrollToEditor()
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
                          {c.type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}: <br />{c.key} {c.title && `- ${c.title}`}
                        </button>
                      ))
                    )}
              </section>

              <section data-agent="new-concept-section">
                <div className="title">New concept</div>

                <div style={brutal.formRow}>
                  <div style={brutal.label}>Key</div>
                  <input
                    data-agent="input-new-concept-key"
                    placeholder="e.g. BRAKE_FAILURE"
                    value={newConceptKey}
                    onChange={(e) => setNewConceptKey(e.target.value)}
                    style={{ ...brutal.input, flex: 1 }}
                  />
                </div>

                <div style={brutal.formRow}>
                  <div style={brutal.label}>Title</div>
                  <input
                    data-agent="input-new-concept-title"
                    placeholder="optional"
                    value={newConceptTitle}
                    onChange={(e) => setNewConceptTitle(e.target.value)}
                    style={{ ...brutal.input, flex: 1 }}
                  />
                </div>

                <div style={brutal.formRow}>
                  <div style={brutal.label}>Phase</div>
                  <select
                    data-agent="select-new-concept-phase"
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
                    data-agent="select-new-concept-asil"
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
                    data-agent="select-new-concept-type"
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

                <button data-agent="btn-create-concept" onClick={() => { createConcept() }} style={brutal.button}>
                  Create
                </button>

              </section>
            </div>

            <section data-agent="editor-section">
              <div className="title">Edit concept</div>

              {activeConcept && (
                <>
                  <div style={brutal.formRow}>
                    <div style={brutal.label}>Key</div>
                    <input
                      data-agent="input-edit-concept-key"
                      value={editConceptKey}
                      onChange={(e) => setEditConceptKey(e.target.value)}
                      style={brutal.input}
                    />
                  </div>
                  <div style={brutal.formRow}>
                    <div style={brutal.label}>Title</div>
                    <input
                      data-agent="input-edit-concept-title"
                      value={editConceptTitle}
                      onChange={(e) => setEditConceptTitle(e.target.value)}
                      style={brutal.input}
                    />
                  </div>
                  <div style={brutal.formRow}>
                    <div style={brutal.label}>Type</div>
                    <select
                      data-agent="select-edit-concept-type"
                      value={editConceptType}
                      onChange={(e) => setEditConceptType(e.target.value)}
                      style={brutal.select}
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
                  <div style={brutal.formRow}>
                    <div style={brutal.label}>Phase</div>
                    <select
                      data-agent="select-edit-concept-phase"
                      value={editConceptPhase}
                      onChange={(e) => setEditConceptPhase(e.target.value)}
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
                      data-agent="select-edit-concept-asil"
                      value={editConceptAsil}
                      onChange={(e) => setEditConceptAsil(e.target.value)}
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
                  <button data-agent="btn-save-concept" onClick={saveConcept} style={brutal.button}>Save concept</button>
                </>
              )}
            </section>

            <section data-agent="markdown-editor-section">
              <div className="title">Revise concept</div>

              {activeRevisionId && (
                <div data-agent="editor-info" style={{ fontFamily: "monospace", marginBottom: 8 }}>
                  Revision: {activeRevisionId}
                </div>
              )}

              <BrutalistMarkdownEditor value={editorValue} onChange={setEditorValue} />

              <button data-agent="btn-save-revision" onClick={() => { revise() }} style={{ ...brutal.button, marginTop: 8 }}>
                Save revision
              </button>
            </section>

            <section data-agent="revisions-section">
              <div className="title">Concept revisions</div>

              {(revisionsByConcept[selectedConcept] || []).length === 0 ? (
                <p>
                  No revisions for this concept.
                </p>
              ) : (
                <div className="list-input">
                  {(revisionsByConcept[selectedConcept] || []).map((r) => {
                    const isBase = r.id === baseId
                    const isTarget = r.id === targetId

                    return (
                      <div
                        className="option2"
                        data-agent={`revision-${r.id}`}
                        key={r.id}
                        style={{
                          ...(isBase ? brutal.rowBase : {}),
                          ...(isTarget ? brutal.rowTarget : {}),
                        }}
                      >
                        <div data-agent="revision-id" className="list-id">{r.id.slice(0, 16)}</div>

                        <div data-agent="revision-markdown" className="list-tooltip">{r.markdown.slice(0, 100)}...</div>

                        <div style={brutal.actions}>
                          <button
                            data-agent="btn-load-revision"
                            onClick={() => {
                              setActiveRevisionId(r.id)
                              setSelectedConcept(r.conceptId)
                              setEditorValue(r.markdown)
                            }}
                            style={brutal.button}
                          >
                            Load
                          </button>

                          <div style={{
                            border: "1px solid black", margin: "0 1rem",
                            ...(isBase || isTarget ? { borderColor: "white" } : {})
                          }} />

                          <button
                            data-agent="btn-set-base"
                            onClick={() => setBaseId(r.id)}
                            style={{
                              ...brutal.button,
                              ...(isBase ? brutal.active : {}),
                            }}
                          >
                            Base
                          </button>

                          <button
                            data-agent="btn-set-head"
                            onClick={() => setTargetId(r.id)}
                            style={{
                              ...brutal.button,
                              ...(isTarget ? brutal.active : {}),
                            }}
                          >
                            Head
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {baseId && targetId && hunks.length === 0 && (
                <div data-agent="diff-no-differences" style={{ marginTop: "1em", marginBottom: "1em", fontStyle: "italic" }}>
                  No differences between these revisions.
                </div>
              )}
              {baseId && targetId && hunks.length > 0 && (
                <div data-agent="diff-view" style={{ background: "white", border: "2px solid black", marginTop: "1em" }}>
                  <p style={{ margin: "1em", fontStyle: "italic" }}>
                    <code>{baseId.slice(0, 16)}</code>{" → "}
                    <code>{targetId.slice(0, 16)}</code>
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
            <section data-agent="import-concepts-section">
              <div className="title">Import concepts</div>
              {typeof templates === "undefined" ? (
                <>
                  Loading templates...
                </>
              ) :
                templates.length === 0 ? (
                  <p>
                    No templates yet.
                  </p>
                ) : (
                  <div className="list-input">
                    {templates.map((wi) => (
                      <div className="option" data-agent={`template-${wi.id}`} key={wi.id} onClick={async () => {
                        importConceptsFromTemplate(wi.id)
                      }}>
                        <div className="list-id">{wi.key} - {wi.name}</div>
                        <div className="list-tooltip">
                          {wi.description ? `${wi.description}` : "No description :("}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </section>

            <hr />

            <section data-agent="baselines-section">
              <div className="title">Baselines</div>

              {typeof baselines === "undefined" ? (
                <>
                  Loading baselines...
                </>
              ) :
                baselines.length === 0 ? (
                  <p>
                    No baselines yet.
                  </p>
                ) :
                  (
                    <>
                      {baselines.map((b) => (
                        <button
                          data-agent={`baseline-${b.id}`}
                          key={b.id}
                          onClick={async () => {
                            const full = await apiFetch(`${API}/baselines/${b.id}`).then((r) => r.json())
                            setSelectedBaseline(full)
                          }}
                          style={{ ...brutal.button, display: "block", marginBottom: 4 }}
                        >
                          {b.name}
                        </button>
                      ))}
                    </>
                  )}
            </section>
            {selectedBaseline && (
              <>
                <section data-agent="selected-baseline-section">
                  <div className="title">
                    Baseline: {selectedBaseline.name}
                  </div>

                  <div className="list-input">
                    {selectedBaseline.items.map((item: any) => {
                      const r = item.revision

                      return (
                        <div key={r.id}>
                          <div style={{ width: 120, overflow: "hidden" }}>
                            {r.concept.key} ({r.concept.type})
                          </div>

                          <div className="list-tooltip">
                            {r.markdown.slice(0, 80)}...
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              </>
            )}

            <section data-agent="new-baseline-section">
              <div className="title">New baseline</div>

              <input
                data-agent="input-baseline-name"
                placeholder="Baseline name"
                value={baselineName}
                onChange={(e) => setBaselineName(e.target.value)}
                style={{ ...brutal.input, marginBottom: 8 }}
              />

              {Object.keys(revisionsByConcept).length === 0 ? (
                <p>
                  No revisions for this concept.
                </p>
              ) : (
                <>
                  <div className="list-input">
                    {Object.values(revisionsByConcept)
                      .flat()
                      .map((r) => {
                        const checked = selectedRevisions.includes(r.id)

                        return (
                          <div
                            className="option2"
                            data-agent={`baseline-revision-${r.id}`}
                            key={r.id}
                            onClick={() => toggleRevision(r.id)}
                            style={{
                              background: checked ? "black" : "white",
                              color: checked ? "white" : "black",
                            }}
                          >
                            <div className="list-id">{r.id.slice(0, 16)}</div><div className="list-tooltip">{r.markdown.slice(0, 120)}...</div>
                          </div>
                        )
                      })}
                  </div>

                  <button
                    data-agent="btn-create-baseline"
                    onClick={createBaseline}
                    style={{ ...brutal.button, marginTop: 8 }}
                  >
                    Create baseline
                  </button>
                </>
              )}
            </section>

            <hr />

            <section data-agent="generate-llm-section">
              <div className="title">Generate content with LLM</div>

              <input type="text"
                data-agent="input-llm-prompt"
                placeholder="Enter prompt for LLM"
                value={llmPrompt}
                onChange={(e) => setLlmPrompt(e.target.value)}
                style={{ ...brutal.input, marginBottom: 8 }}
              />

              <button
                data-agent="btn-generate-llm"
                onClick={generateWithLLM}
                style={brutal.button}
              >
                Generate
              </button>
            </section>

            <hr />

            <footer>
              © 2026 WCGW Software // Residual vibecode HAZARD has been deemed ACCEPTABLE under nominal operating conditions. :)
            </footer>
          </aside>
        </>
      )}
      {!!user && (
        <main>
          <GraphView
            loading={graph === null}
            revisions={(graph?.revisions ?? []).filter((r: Revision) => {
              const revisionsForConcept = (graph?.revisions ?? []).filter((rev: Revision) => rev.conceptId === r.conceptId)
              const latestRevision = revisionsForConcept.reduce((latest: Revision, current: Revision) =>
                new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                , revisionsForConcept[0])

              return r.id === latestRevision.id
            })}
            concepts={graph?.concepts ?? []}
            relations={graph?.relations ?? []}
            onRelationCreated={() => { refreshGraph(selectedWorkItem) }}
            onNodeClick={async (conceptId) => {
              setSelectedConcept(conceptId)

              const revisions = await loadRevisions(conceptId)

              const latest = revisions.at(-1)

              if (latest) {
                setActiveRevisionId(latest.id)
                setEditorValue(latest.markdown)
              } else {
                setActiveRevisionId(null)
                const concept = (graph?.concepts ?? []).find((c: any) => c.id === conceptId)
                setEditorValue(concept?.title ? `# ${concept.title}` : "")
              }

              scrollToEditor()
            }}
            API={API}
          />
        </main>
      )
      }
    </>
  )
}