import logo from "./assets/logo.png"
import { useAuth0 } from "@auth0/auth0-react"
import { useCallback, useEffect, useState } from "react"
import { parseDiff, Diff, Hunk, type HunkData, type DiffType } from "react-diff-view"
import "react-diff-view/style/index.css"
import { diffLines, formatLines } from "unidiff"
import GraphView from "./components/GraphView"
import { LlmTools } from "./components/LlmTools"
import NewWorkItemModal from "./components/NewWorkItemModal"
import NewConceptModal from "./components/NewConceptModal"
import { OfflineBanner } from "./components/OfflineBanner"
import { useApiFetch } from "./lib/apiFetchContext"
import { BrutalistMarkdownEditor } from "./components/BrutalistMarkdownEditor"
import WorkItemCard from "./components/WorkItemCard"
import ConceptCard from "./components/ConceptCard"
import background from "./assets/background.jpg"
import { runOnboardingTour } from "./lib/demoRunner"

const API = import.meta.env.VITE_API_URL || ""

type Project = { id: string, key: string }

export type LifecyclePhase = "ITEM_DEFINITION" | "HARA" | "FUNCTIONAL_SAFETY" | "TECHNICAL_SAFETY" | "SYSTEM_DESIGN" | "SOFTWARE_DESIGN" | "IMPLEMENTATION" | "VERIFICATION" | "VALIDATION" | "PRODUCTION" | "OPERATION" | "DECOMMISSIONING"

export type ASIL = "QM" | "ASIL_A" | "ASIL_B" | "ASIL_C" | "ASIL_D"
export type SIL = "SIL_1" | "SIL_2" | "SIL_3" | "SIL_4"
export type PL = "PL_A" | "PL_B" | "PL_C" | "PL_D" | "PL_E"
export type Standard = "ISO_26262" | "IEC_61508" | "ISO_13849"

export type Concept = {
  id: string
  key: string
  type: string
  title: string
  phase?: LifecyclePhase
  asil?: ASIL
  sil?: SIL
  pl?: PL
  standards?: Standard[]
  createdBy: { name: string }
}

export const backgroundImage = background;

export const typeColor: Record<string, string> = {
  // Neutral / base
  ITEM: "#DCE7F5",

  // Risk / hazard domain
  HAZARD: "#F2B8B5",
  HARM: "#F2B8B5",
  ANOMALY: "#F2B8B5",

  // Safety intent / argumentation
  SAFETY_GOAL: "#F3D9A2",
  SAFETY_CASE: "#F3D9A2",

  // Functional / technical requirements
  FSR: "#A8E6CF",
  TSR: "#9DD9F3",
  SSR: "#CDBCF6",
  SOFTWARE_REQUIREMENT: "#CDBCF6",
  HARDWARE_REQUIREMENT: "#D6D6D6",

  // Constraints / assumptions
  ASSUMPTION: "#E7C6E6",
  CONSTRAINT: "#AEE5DF",

  // Testing family
  TEST_CASE: "#F6E58D",
  TEST_RESULT: "#F2D16B",
  VERIFICATION_REPORT: "#BFE7C6",
  VALIDATION_REPORT: "#A9D6E5",

  // Documentation
  SAFETY_MANUAL: "#AEE5DF",

  // Change / process
  CHANGE_REQUEST: "#E7C6E6",
}

type Revision = {
  id: string
  conceptId: string
  markdown: string
  createdBy: { name: string }
  createdAt: string
}

export type WorkItem = {
  id: string
  key: string
  name: string
  description?: string
  createdBy: { name: string }
  createdAt: string
  phase?: LifecyclePhase
  asil?: ASIL
  sil?: SIL
  pl?: PL
  standards?: Standard[]
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
    fontWeight: 600,
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

  disabled: {
    opacity: 0.6,
    cursor: "not-allowed"
  },

  select: {
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
    font: "IBM Plex Mono, monospace"
  },

  tag: {
    display: "inline-block",
    padding: "1px 8px",
    border: "2px solid black",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "monospace",
    marginRight: 4,
    marginBottom: 2,
    lineHeight: 1.4,
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
        <div data-agent="auth-loading" style={{ ...brutal.input, ...brutal.disabled }}>Auth…</div>
      ) : isAuthenticated ? (
        <>
          <div
            data-agent="auth-user-info"
            style={{
              ...brutal.input,
              ...brutal.disabled,
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
      )
      }
    </div >
  )
}

function scrollToEditConcept() {
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

    return withLoading("Joining project...", async () => {
      const res = await apiFetch(
        `${API}/projects/${encodeURIComponent(projectKey)}/users`,
        {
          method: "POST",
        }
      )

      if (!res.ok) {
        throw new Error("Failed to join project")
      }

      await refreshProjects()

      setProjectKey("")
    })
  }

  const refreshProjects = async () => {
    return withLoading("Loading projects...", async () => {
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
    })
  }

  useEffect(() => {
    async function welcomeUser(): Promise<void> {
      await refreshProjects()
    }
    if (!user) return

    welcomeUser();
  }, [user])

  const [workItems, setWorkItems] = useState<WorkItem[] | null>(null)
  const [workItemsInitialized, setWorkItemsInitialized] = useState(false)
  workItemsInitialized
  const [selectedWorkItem, setSelectedWorkItem] = useState<string>("")
  const [selectedWorkItemData, setSelectedWorkItemData] = useState<WorkItem | null>(null)

  const [templates, setTemplates] = useState<WorkItem[]>()

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

  const [diffResult, setDiffResult] = useState<{ type: string; hunks: HunkData[] } | null>(null)


  const [editConceptType, setEditConceptType] = useState("ITEM")
  const [editConceptPhase, setEditConceptPhase] = useState("ITEM_DEFINITION")
  const [editConceptAsil, setEditConceptAsil] = useState("QM")
  const [editConceptSil, setEditConceptSil] = useState("")
  const [editConceptPl, setEditConceptPl] = useState("")
  const [editConceptStandards, setEditConceptStandards] = useState<Standard[]>([])
  const [editConceptTitle, setEditConceptTitle] = useState("")
  const [editConceptKey, setEditConceptKey] = useState("")

  const [showNewWorkItemModal, setShowNewWorkItemModal] = useState(false)
  const [showNewConceptModal, setShowNewConceptModal] = useState(false)

  const [editWorkItemName, setEditWorkItemName] = useState("")
  const [editWorkItemDescription, setEditWorkItemDescription] = useState("")
  const [editWorkItemPhase, setEditWorkItemPhase] = useState<LifecyclePhase | "">("")
  const [editWorkItemAsil, setEditWorkItemAsil] = useState<ASIL | "">("")
  const [editWorkItemSil, setEditWorkItemSil] = useState<SIL | "">("")
  const [editWorkItemPl, setEditWorkItemPl] = useState<PL | "">("")
  const [editWorkItemStandards, setEditWorkItemStandards] = useState<Standard[]>([])
  const [editWorkItemApplicationContext, setEditWorkItemApplicationContext] = useState("")
  const [editWorkItemSystemBoundary, setEditWorkItemSystemBoundary] = useState("")

  const [graph, setGraph] = useState<any>(null)

  const [baselines, setBaselines] = useState<any[]>()
  const [selectedBaseline, setSelectedBaseline] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("Loading...")

  const [nodeClickLoading, setNodeClickLoading] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void; confirmLabel?: string; cancelLabel?: string } | null>(null)

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
        refreshBaselines()
      ])

      setTimeout(() => {
        setLoading(false)
        setLoadingMessage("")
        runOnboardingTour()
      }, 3000)
    }

    load()
  }, [selectedWorkItem])

  useEffect(() => {
    if (selectedWorkItemData) {
      setEditWorkItemName(selectedWorkItemData.name || "")
      setEditWorkItemDescription(selectedWorkItemData.description || "")
      setEditWorkItemPhase(selectedWorkItemData.phase || "")
      setEditWorkItemAsil(selectedWorkItemData.asil || "")
      setEditWorkItemSil(selectedWorkItemData.sil || "")
      setEditWorkItemPl(selectedWorkItemData.pl || "")
      setEditWorkItemStandards(selectedWorkItemData.standards || [])
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
        setEditConceptSil(concept.sil || "")
        setEditConceptPl(concept.pl || "")
        setEditConceptStandards(concept.standards || [])
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

        await loadRevisions(data[0].id)
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

    setDiffResult({ type: diff?.type || "unified", hunks: diff?.hunks || [] })
  }, [baseId, targetId, revisionsByConcept])

  async function revise(revision?: Revision) {
    return withLoading("Saving revision...", async () => {
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

      const res = await apiFetch(`${API}/workflow/submit-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const createdRevision = res.ok ? await res.json() : null

      if (createdRevision) {
        setActiveRevisionId(createdRevision.id)
      }

      await loadRevisions(selectedConcept)
      await refreshGraph(selectedWorkItem)
    })
  }

  function toggleRevision(id: string) {
    setSelectedRevisions((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    )
  }

  async function createBaseline() {
    return withLoading("Creating baseline...", async () => {
      await apiFetch(`${API}/baselines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: baselineName,
          revisions: selectedRevisions,
          user: actorForApi,
        }),
      })

      await refreshBaselines()
      setSelectedRevisions([])
      setBaselineName("")
    })
  }

  async function saveConcept() {
    if (!selectedConcept) return

    return withLoading("Saving concept...", async () => {
      await apiFetch(`${API}/concepts/${selectedConcept}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editConceptKey,
          type: editConceptType,
          title: editConceptTitle,
          phase: editConceptPhase,
          asil: editConceptAsil || undefined,
          sil: editConceptSil || undefined,
          pl: editConceptPl || undefined,
          standards: editConceptStandards.length > 0 ? editConceptStandards : undefined,
          user: actorForApi
        }),
      })

      setActiveConcept({
        id: selectedConcept,
        key: editConceptKey,
        type: editConceptType,
        title: editConceptTitle,
        phase: editConceptPhase as LifecyclePhase,
        asil: editConceptAsil as ASIL,
        sil: editConceptSil as SIL,
        pl: editConceptPl as PL,
        standards: editConceptStandards,
        createdBy: activeConcept?.createdBy || { name: "" },
      })

      setConcepts((prev) =>
        (prev ?? []).map((c) =>
          c.id === selectedConcept
            ? {
                ...c,
                key: editConceptKey,
                type: editConceptType,
                title: editConceptTitle,
                phase: editConceptPhase as LifecyclePhase,
                asil: editConceptAsil as ASIL,
                sil: editConceptSil as SIL,
                pl: editConceptPl as PL,
                standards: editConceptStandards,
              }
            : c
        )
      )

      await refreshGraph(selectedWorkItem)
    })
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

    return withLoading("Saving work item...", async () => {
      await apiFetch(`${API}/work-items/${selectedWorkItemData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editWorkItemName,
          description: editWorkItemDescription,
          phase: editWorkItemPhase,
          asil: editWorkItemAsil || undefined,
          sil: editWorkItemSil || undefined,
          pl: editWorkItemPl || undefined,
          standards: editWorkItemStandards.length > 0 ? editWorkItemStandards : undefined,
          applicationContext: editWorkItemApplicationContext,
          systemBoundary: editWorkItemSystemBoundary,
          user: actorForApi
        }),
      })

      await loadWorkItemDetails(selectedWorkItemData.id)
      await refreshGraph(selectedWorkItem)

      setWorkItems((prev) =>
        (prev ?? []).map((wi: WorkItem) =>
          wi.id === selectedWorkItemData.id
            ? { ...wi, name: editWorkItemName, description: editWorkItemDescription }
            : wi
        )
      )
    })
  }

  async function refreshGraph(workItemId: string) {
    const data = await apiFetch(`${API}/graph/${workItemId}`).then((r) => r.json())
    setGraph(data)
  }

  async function importConceptsFromTemplate(workItemId: string) {
    return withLoading("Importing concepts from template...", async () => {
      const res = await apiFetch(`${API}/graph/${workItemId}`)
      const { concepts: importedConcepts, relations: importedRelations } = await res.json()

      await apiFetch(`${API}/work-items/${selectedWorkItem}/graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepts: importedConcepts,
          relations: importedRelations,
          user: actorForApi
        }),
      })

      await loadConcepts(selectedWorkItem)
      await refreshGraph(selectedWorkItem)
    })
  }

  async function refreshBaselines() {
    const data = await apiFetch(`${API}/baselines`).then((r) => r.json())
    setBaselines(data)
  }

  const handleNewWorkItemCreate = async (key: string, title: string) => {
    if (!key.trim() || !selectedProject) return

    return withLoading("Creating work item...", async () => {
      const res = await apiFetch(`${API}/work-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          name: title,
          projectId: selectedProject.id,
          user: actorForApi
        }),
      })

      if (!res.ok) return

      const created = await res.json()

      setWorkItems((prev) => [...(prev ?? []), created])
      setSelectedWorkItem(created.id)
      setShowNewWorkItemModal(false)
    })
  }

  const handleNewConceptCreate = async (key: string, title: string, type: string, phase: string, asil: string, sil: string, pl: string, standards: Standard[]) => {
    if (!key.trim()) return

    return withLoading("Creating concept...", async () => {
      const url = selectedWorkItem
        ? `${API}/work-items/${selectedWorkItem}/concepts`
        : `${API}/concepts`

      const body = {
        key,
        type,
        title,
        phase,
        asil: asil || undefined,
        sil: sil || undefined,
        pl: pl || undefined,
        standards: standards.length > 0 ? standards : undefined,
        createdBy: { name: actorForApi }
      }

      const res = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const created = await res.json()

      setConcepts((prev) => [...(prev ?? []), created])
      setSelectedConcept(created.id)
      setShowNewConceptModal(false)

      await loadRevisions(created.id)
      await refreshGraph(selectedWorkItem)
      await refreshBaselines()
    })
  }

  return (
    <>
      <OfflineBanner />
      {pendingConfirm && (
        <div
          data-agent="confirm-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              border: "2px solid black",
              background: "rgb(233, 237, 233)",
              padding: 24,
              fontFamily: "monospace",
              fontSize: 14,
              maxWidth: 400,
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 16px 0" }}>{pendingConfirm.message}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                onClick={() => {
                  setPendingConfirm(null)
                }}
                style={{ ...brutal.button, background: "#BFE7C6" }}
              >
                {pendingConfirm.cancelLabel || "Keep editing"}
              </button>
              <button
                onClick={() => {
                  const fn = pendingConfirm.onConfirm
                  setActiveRevisionId(null)
                  setEditorValue("")
                  setPendingConfirm(null)
                  fn()
                }}

                style={{ ...brutal.button, background: "#F2B8B5" }}
              >
                {pendingConfirm.confirmLabel || "Discard & proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div
          className="loading-overlay"
          data-agent="loading-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(255,255,255,0.8)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            className="loading-message"
            data-agent="loading-message"
            style={{
              border: "2px solid black",
              background: "rgb(255,255,255)",
              padding: 18,
              fontSize: 16,
            }}
          >
            {loadingMessage}
          </div>
        </div>
      )}

      {showNewWorkItemModal && (
        <NewWorkItemModal
          onCreate={(key, title) => {
            handleNewWorkItemCreate(key, title)
          }}
          onClose={() => setShowNewWorkItemModal(false)}
        />
      )}

      {showNewConceptModal && (
        <NewConceptModal
          onCreate={(key, title, type, phase, asil, sil, pl, standards) => {
            handleNewConceptCreate(key, title, type, phase, asil, sil, pl, standards)
          }}
          onClose={() => setShowNewConceptModal(false)}
        />
      )}

      <header data-agent="top-header" className="top-header" style={!user && { padding: 80 } || {}}>
        <img src={logo} alt="Logo" className="logo" data-agent="logo" />

        <section style={{ flex: 1 }} data-agent="user-section">
          {auth0Enabled ? (
            <>
              <div className="title">User</div>
              <Auth0UserBar onActorResolved={onActorResolved} />
            </>
          ) : (
            <>
              <h1>👺</h1>
              <p>Something went wrong. Call the developer.</p>
            </>
          )}
        </section>
      </header>

      {!user && (
        <aside>
          <hr />
          <article style={{ padding: 80, maxWidth: 1100 }}>
            <h1>
              IEC 61508 -derived standardisation for functional safety across automotive,
              robotics, components and industrial machinery
            </h1>

            <p>
              Our platform enables manufacturers and safety consultants to design for
              compliance from the start — reducing rework, accelerating certification
              readiness, and improving traceability across the entire safety process.
              Built around IEC 61508 and its derived standards ISO 26262 and
              ISO 13849, the platform covers hazard analysis, safety requirements,
              validation evidence, lifecycle documentation and traceability within a
              single structured environment.
            </p>

            <p>
              Teams can proactively identify risks, maintain audit-ready documentation,
              and align engineering decisions with functional safety obligations long
              before production or assessment begins.
            </p>
          </article>
          <hr />
          <footer>
            2026 WCGW. 👺 denotes hazardous software!
          </footer>
        </aside>
      )}
      {!!user && (
        <>
          <hr />

          <aside>
            <div className="cms-layout">
              <section style={{ flex: 1 }} data-agent="project-section">
                <div className="title">Projects</div>

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
                <div className="title">Join project</div>

                <input
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  placeholder="e.g. COMMON-MEGA-PROJECT"
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

            {!!selectedProject && (
              <>
                <hr />

                <section data-agent="work-items-section">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div className="title" style={{ margin: 0 }}>Work items</div>
                    <button
                      data-agent="btn-open-new-work-item-modal"
                      onClick={() => setShowNewWorkItemModal(true)}
                      style={{ ...brutal.button, margin: 0 }}
                    >
                      + Create new
                    </button>
                  </div>
                  {workItems === null ? (
                    <p>Loading work items...</p>
                  ) :
                    workItems.length === 0 ? (
                      <p>
                        No work items yet.
                      </p>
                    ) : (
                      workItems.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div data-agent="work-items-list" className="list-input">
                            {workItems.map((workItem) => (
                              <div
                                className="option"
                                data-agent={`work-item-${workItem.id}`}
                                key={workItem.id}
                                onClick={() => setSelectedWorkItem(workItem.id)}
                                style={{
                                  ...(selectedWorkItem === workItem.id ? { background: "rgb(255, 90, 0)", color: "#fff" } : {}),
                                  cursor: "pointer",
                                }}
                              >
                                {workItem.key} — {workItem.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                </section>

                {!!selectedWorkItem && (
                  <section>
                    <WorkItemCard
                      workItem={selectedWorkItemData}
                      editName={editWorkItemName}
                      editDescription={editWorkItemDescription}
                      editPhase={editWorkItemPhase}
                      editAsil={editWorkItemAsil}
                      editSil={editWorkItemSil}
                      editPl={editWorkItemPl}
                      editStandards={editWorkItemStandards}
                      editApplicationContext={editWorkItemApplicationContext}
                      editSystemBoundary={editWorkItemSystemBoundary}
                      onEditName={setEditWorkItemName}
                      onEditDescription={setEditWorkItemDescription}
                      onEditPhase={setEditWorkItemPhase}
                      onEditAsil={setEditWorkItemAsil}
                      onEditSil={setEditWorkItemSil}
                      onEditPl={setEditWorkItemPl}
                      onEditStandards={setEditWorkItemStandards}
                      onEditApplicationContext={setEditWorkItemApplicationContext}
                      onEditSystemBoundary={setEditWorkItemSystemBoundary}
                      onSave={saveWorkItem}
                      onPendingConfirm={setPendingConfirm}
                    />
                  </section>
                )}

                <hr />

                <section data-agent="concepts-section">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div className="title" style={{ margin: 0 }}>Concepts</div>
                    <button
                      data-agent="btn-open-new-concept-modal"
                      onClick={() => setShowNewConceptModal(true)}
                      style={{ ...brutal.button, margin: 0 }}
                    >
                      + Create new
                    </button>
                  </div>
                  {concepts === null ? (
                    <p>Loading concepts...</p>
                  ) :
                    concepts.length === 0 ? (
                      <p>
                        No concepts yet.
                      </p>
                    ) :
                      (
                        <div className="list-input" style={{ maxHeight: 300, overflow: "auto" }}>
                          {concepts.map((c) => (
                            <div
                              className="option"
                              data-agent={`concept-${c.id}`}
                              key={c.id}
                              onClick={() => {
                                const action = async () => {
                                  setNodeClickLoading(true)
                                  setSelectedConcept(c.id)
                                  try {
                                    const revisions = await loadRevisions(c.id)
                                    setActiveRevisionId(revisions?.[0]?.id || null)
                                    setEditorValue(revisions?.[0]?.markdown || "")
                                    scrollToEditConcept()
                                  } finally {
                                    setNodeClickLoading(false)
                                  }
                                }

                                if (activeRevisionId) {
                                  setPendingConfirm({
                                    message: "You have an active revision in progress. Discard it and open this concept?",
                                    onConfirm: action,
                                  })
                                } else {
                                  action()
                                }
                              }}
                              style={{
                                background: selectedConcept === c.id ? "rgb(255, 90, 0)" : undefined,
                                color: selectedConcept === c.id ? "#fff" : undefined,
                              } as React.CSSProperties}
                            >
                            <span style={{
                              ...brutal.tag,
                              background: typeColor[c.type] || "#ccc",
                              color: "#000",
                              whiteSpace: "nowrap",
                            }}>
                              {c.type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>
                              <div className="list-tooltip">
                                {c.key} {c.title && `- ${c.title}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                </section>

                {activeConcept && (
                  <section data-agent="editor-section">
                    <ConceptCard
                      concept={activeConcept}
                      editKey={editConceptKey}
                      editTitle={editConceptTitle}
                      editType={editConceptType}
                      editPhase={editConceptPhase}
                      editAsil={editConceptAsil}
                      editSil={editConceptSil}
                      editPl={editConceptPl}
                      editStandards={editConceptStandards}
                      onEditKey={setEditConceptKey}
                      onEditTitle={setEditConceptTitle}
                      onEditType={setEditConceptType}
                      onEditPhase={setEditConceptPhase}
                      onEditAsil={setEditConceptAsil}
                      onEditSil={setEditConceptSil}
                      onEditPl={setEditConceptPl}
                      onEditStandards={setEditConceptStandards}
                      onSave={saveConcept}
                      onPendingConfirm={setPendingConfirm}
                    />
                  </section>
                )}

                <section data-agent="revisions-section">
                  <div className="title">Concept revisions</div>

                  {revisionsByConcept[selectedConcept] === undefined && (
                    <p>Loading revisions...</p>
                  )}

                  {revisionsByConcept[selectedConcept] !== undefined &&
                    revisionsByConcept[selectedConcept].length === 0 && (
                      <p>No revisions for this concept. <button style={brutal.button} onClick={() => revise({
                        conceptId: selectedConcept,
                        markdown: ""
                      } as Revision)}>Create initial revision</button></p>
                    )}

                  {revisionsByConcept[selectedConcept] !== undefined &&
                    revisionsByConcept[selectedConcept].length > 0 && (
                      <div className="list-input">
                        {revisionsByConcept[selectedConcept].map((r) => {
                          const isBase = r.id === baseId
                          const isTarget = r.id === targetId

                          return (
                            <div
                              className="option option--narrow"
                              data-agent={`revision-${r.id}`}
                              key={r.id}
                              style={{
                                ...(isBase ? brutal.rowBase : {}),
                                ...(isTarget ? brutal.rowTarget : {}),
                              }}
                            >
                              <div
                                data-agent="revision-id"
                                className="list-id"
                              >
                                {r.id.slice(0, 16)}
                              </div>

                              <div
                                data-agent="revision-created-by"
                                className="list-tooltip"
                                style={{ fontSize: 11, opacity: 0.7 }}
                              >
                                {r.createdBy?.name || "unknown"}
                              </div>

                              <div
                                data-agent="revision-markdown"
                                className="list-tooltip"
                              >
                                {r.markdown.slice(0, 100)}...
                              </div>

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

                                <div
                                  style={{
                                    border: "1px solid black",
                                    margin: "0 1rem",
                                    ...(isBase || isTarget
                                      ? { borderColor: "white" }
                                      : {}),
                                  }}
                                />

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
                </section>

                {baseId && targetId && diffResult && diffResult.hunks.length > 0 && (
                  <section data-agent="diff-section">
                    <div className="title">Diff ({baseId} → {targetId})</div>
                    <div style={{
                      border: "2px solid black",
                      background: "white",
                      fontFamily: "monospace",
                      fontSize: 12,
                      overflowX: "auto",
                      marginBottom: 16,
                    }}>
                      <Diff diffType={diffResult.type as DiffType} viewType="unified" hunks={diffResult.hunks}>
                        {hunks => hunks.map((hunk, i) => (
                          <Hunk key={i} hunk={hunk} />
                        ))}
                      </Diff>
                    </div>
                  </section>
                )}

                {baseId && targetId && diffResult && diffResult.hunks.length === 0 && (
                  <p>No difference between {baseId} and {targetId}.</p>
                )}

                <hr />
                <section data-agent="import-concepts-section">
                  <div className="title">Import concepts to work item</div>
                  {templates === undefined ? (
                    <p>
                      Loading templates...
                    </p>
                  ) :
                    templates.length === 0 ? (
                      <p>
                        No templates yet.
                      </p>
                    ) : (
                      <div className="list-input">
                        {templates.map((wi) => (
                          <div className="option" data-agent={`template-${wi.id}`} key={wi.id} onClick={() => {
                            const action = () => { importConceptsFromTemplate(wi.id) }

                            if (activeRevisionId) {
                              setPendingConfirm({
                                message: "You have an active revision in progress. Discard it and import concepts from template?",
                                onConfirm: action,
                              })
                            } else {
                              action()
                            }
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

                  {baselines === undefined ? (
                    <p>
                      Loading baselines...
                    </p>
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
                            <div
                              key={r.id}
                              className="option"
                              onClick={() => {
                                setActiveRevisionId(r.id)
                                setSelectedConcept(r.conceptId)
                                setEditorValue(r.markdown)
                              }}>
                              <div className="list-id">
                                {r.concept.key} - {r.concept.type} ({r.id})
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

                {!!revisionsByConcept && (

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
                                  className="option option--narrow"
                                  data-agent={`baseline-revision-${r.id}`}
                                  key={r.id}
                                  onClick={() => toggleRevision(r.id)}
                                  style={{
                                    background: checked ? "rgb(255, 90, 0)" : "white",
                                    color: checked ? "#fff" : "black",
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
                )}

                {!!selectedWorkItem && (
                  <>
                    <hr />
                    <LlmTools
                      selectedWorkItem={selectedWorkItem}
                      selectedWorkItemData={selectedWorkItemData}
                      activeRevisionId={activeRevisionId}
                      onSetActiveRevisionId={setActiveRevisionId}
                      onSetEditorValue={setEditorValue}
                      actorForApi={actorForApi}
                      apiFetch={apiFetch}
                      onLoadConcepts={loadConcepts}
                      onRefreshGraph={refreshGraph}
                      onSetPendingConfirm={setPendingConfirm}
                      onSetLoading={setLoading}
                      onSetLoadingMessage={setLoadingMessage}
                    />
                  </>
                )}

                <hr />

                <footer>
                  2026 WCGW. 👺 denotes hazardous software!
                </footer>
              </>
            )}
          </aside>
        </>
      )
      }
      {!!user && (
        <main data-agent="graph-view" className={activeRevisionId ? "revise-active" : ""}>
          {nodeClickLoading && (
            <div
              data-agent="node-click-loading"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(255, 255, 255, 0.5)",
                zIndex: 9999,
                display: "grid",
                placeItems: "center",
                padding: 20,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  border: "2px solid black",
                  background: "rgb(255, 255, 255)",
                  padding: 18,
                  fontFamily: "monospace",
                  fontSize: 16,
                }}
              >
                Loading concept...
              </div>
            </div>
          )}
          {activeRevisionId && (() => {
            const allRevisions = Object.values(revisionsByConcept).flat()
            const activeRev = allRevisions.find(r => r.id === activeRevisionId)
            const conceptRevisions = allRevisions.filter(r => r.conceptId === selectedConcept)
            const conceptRevisionIds = new Set(conceptRevisions.map(r => r.id))
            const conceptRelations = (graph?.relations ?? []).filter(
              (rel: any) => conceptRevisionIds.has(rel.fromId) || conceptRevisionIds.has(rel.toId)
            )
            const conceptMap = new Map<string, { id: string; key: string }>((graph?.concepts ?? []).map((c: any) => [c.id, { id: c.id, key: c.key }]))

            return (
              <div data-agent="revise-panel" className="revise-panel">
                <div className="title">Revise concept</div>
                <div data-agent="editor-info" style={{ fontFamily: "monospace", marginBottom: 8 }}>
                  Revision: {activeRevisionId}
                </div>
                {activeRev?.createdBy?.name && (
                  <div data-agent="revision-created-by" style={{ ...brutal.formRow, marginBottom: 8 }}>
                    <div style={brutal.label}>Created by</div>
                    <div style={{ ...brutal.input, ...brutal.disabled, flex: 1 }}>
                      {activeRev.createdBy.name}
                    </div>
                  </div>
                )}
                <BrutalistMarkdownEditor
                  value={editorValue}
                  onChange={setEditorValue}
                  relations={conceptRelations}
                  allRevisions={allRevisions}
                  conceptMap={conceptMap}
                />
                <div style={{ display: "inline-flex", gap: 8, width: "fit-content" }}>
                  <button data-agent="btn-save-revision" onClick={() => { revise() }} style={{ ...brutal.button, background: "#BFE7C6" }}>
                    Save revision
                  </button>
                  <button
                    data-agent="btn-cancel-revision"
                    onClick={() => { setActiveRevisionId(null); setEditorValue("") }}
                    style={{
                      ...brutal.button,
                      backgroundColor: "#F2B8B5"
                    }}>
                    Discard
                  </button>
                </div>
              </div>
            )
          })()}
          <GraphView
            loading={!!user && graph === null && !!selectedWorkItem}
            revisions={user ? (graph?.revisions ?? []).filter((r: Revision) => {
              const revisionsForConcept = (graph?.revisions ?? []).filter((rev: Revision) => rev.conceptId === r.conceptId)
              const latestRevision = revisionsForConcept.reduce((latest: Revision, current: Revision) =>
                new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                , revisionsForConcept[0])

              return r.id === latestRevision.id
            }) : []}
            concepts={user ? (graph?.concepts ?? []) : []}
            relations={user ? (graph?.relations ?? []) : []}
            onRelationCreated={user ? () => { refreshGraph(selectedWorkItem) } : () => { }}
            onNodeClick={user ? async (conceptId) => {
              const action = async () => {
                setNodeClickLoading(true)
                setSelectedConcept(conceptId)
                try {
                  const revisions = await loadRevisions(conceptId)
                  setActiveRevisionId(revisions?.[0]?.id || null)
                  setEditorValue(revisions?.[0]?.markdown || "")
                  scrollToEditConcept()
                } finally {
                  setNodeClickLoading(false)
                }
              }

              if (activeRevisionId) {
                setPendingConfirm({
                  message: "You have an active revision in progress. Discard it and open this concept?",
                  onConfirm: action,
                })
              } else {
                action()
              }
            } : undefined}
            API={API}
          />
        </main>
      )}
    </>
  )
}