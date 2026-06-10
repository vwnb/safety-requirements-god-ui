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
import { SemanticColor } from "./lib/SemanticColor"
import { InfoButton } from "./components/InfoButton"
import { LicenseModal } from "./components/LicenseModal"
import { AdminLicenses } from "./components/AdminLicenses"
import { CreateProjectModal } from "./components/CreateProjectModal"
import { EditProjectModal } from "./components/EditProjectModal"
import { useCollaboration } from "./lib/useCollaboration"
import { CollaborationBanner } from "./components/CollaborationBanner"

const API = import.meta.env.VITE_API_URL || ""

type Project = { id: string, key: string }

export type LifecyclePhase = "ITEM_DEFINITION" | "HARA" | "FUNCTIONAL_SAFETY" | "TECHNICAL_SAFETY" | "SYSTEM_DESIGN" | "SOFTWARE_DESIGN" | "IMPLEMENTATION" | "VERIFICATION" | "VALIDATION" | "PRODUCTION" | "OPERATION" | "DECOMMISSIONING"

export type ASIL = "QM" | "ASIL_A" | "ASIL_B" | "ASIL_C" | "ASIL_D"
export type SIL = "SIL_1" | "SIL_2" | "SIL_3" | "SIL_4"
export type PL = "PL_A" | "PL_B" | "PL_C" | "PL_D" | "PL_E"
export type Standard = "ISO_26262" | "IEC_61508" | "ISO_13849"
export type ConceptType = string
export type RelationType = string

export type TemplateManifestComposability = {
  mergeKeys: ConceptType[]
  conflicts: string[]
}

export interface TemplateManifest {
  id: string
  workItemId: string
  name: string
  description: string
  tags: string[]
  asilRange: ASIL[]
  silRange: SIL[]
  plRange: PL[]
  phases: LifecyclePhase[]
  requiredConcepts: ConceptType[]
  relationPatterns: RelationType[]
  composability: TemplateManifestComposability
}

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
  ITEM: SemanticColor.STRUCTURE,
  ARCHITECTURE: SemanticColor.STRUCTURE,

  HAZARD: SemanticColor.RISK,
  HARM: SemanticColor.RISK,
  ANOMALY: SemanticColor.RISK,
  FAILURE_RATE: SemanticColor.RISK,
  COMMON_CAUSE_FAILURE: SemanticColor.RISK,

  SAFETY_GOAL: SemanticColor.ARGUMENT,
  SAFETY_CASE: SemanticColor.ARGUMENT,

  FSR: SemanticColor.FUNCTIONAL,
  FUNCTIONAL_SAFETY_REQUIREMENT: SemanticColor.FUNCTIONAL,

  TSR: SemanticColor.TECHNICAL,
  TECHNICAL_SAFETY_REQUIREMENT: SemanticColor.TECHNICAL,

  SSR: SemanticColor.SOFTWARE,
  SOFTWARE_REQUIREMENT: SemanticColor.SOFTWARE,
  SOFTWARE_SAFETY_REQUIREMENT: SemanticColor.SOFTWARE,

  HARDWARE_REQUIREMENT: SemanticColor.HARDWARE,
  HARDWARE_SAFETY_REQUIREMENT: SemanticColor.HARDWARE,

  ASSUMPTION: SemanticColor.ASSUMPTION,
  CONSTRAINT: SemanticColor.ASSUMPTION,

  TEST_CASE: SemanticColor.EVIDENCE,
  TEST_RESULT: SemanticColor.EVIDENCE,
  PROOF_TEST: SemanticColor.EVIDENCE,
  VERIFICATION_REPORT: SemanticColor.EVIDENCE,
  VALIDATION_REPORT: SemanticColor.EVIDENCE,

  SAFETY_MANUAL: SemanticColor.DOCUMENTATION,

  CHANGE_REQUEST: SemanticColor.PROCESS,

  DIAGNOSTIC_COVERAGE: SemanticColor.METRIC,
};

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
    marginRight: 8,
    lineHeight: 1.4,
  },
}

function Auth0UserBar({
  isAdmin,
  onActorResolved,
  onOpenLicense,
  onOpenAdminLicenses,
}: {
  isAdmin: boolean
  onActorResolved: (sub: string) => void
  onOpenLicense: () => void
  onOpenAdminLicenses: () => void
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
            {user?.name + " (" + user?.email + ")" || "Signed in"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-agent="btn-license"
              onClick={onOpenLicense}
              style={brutal.button}
            >
              License
            </button>
            {isAdmin && (
              <button
                data-agent="btn-admin-licenses"
                onClick={onOpenAdminLicenses}
                style={brutal.button}
              >
                Admin: Licenses
              </button>
            )}
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
          </div>
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

      try {
        const meRes = await apiFetch(`${API}/me`)
        if (meRes.ok) {
          const meData = await meRes.json()
          setIsAdmin(meData.isAdmin ?? false)
        }
      } catch {
        // Non-admin or unauthenticated — default to false
      }
    }
    if (!user) return

    welcomeUser();
  }, [user])

  const [workItems, setWorkItems] = useState<WorkItem[] | null>(null)
  const [workItemsInitialized, setWorkItemsInitialized] = useState(false)
  workItemsInitialized
  const [selectedWorkItem, setSelectedWorkItem] = useState<string>("")
  const [selectedWorkItemData, setSelectedWorkItemData] = useState<WorkItem | null>(null)

  const [templates, setTemplates] = useState<(WorkItem & { templateManifest?: TemplateManifest })[]>()
  const [filterText, setFilterText] = useState("")

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
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [showAdminLicenses, setShowAdminLicenses] = useState(false)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

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
  const [loadingCount, setLoadingCount] = useState(0)
  const loading = loadingCount > 0
  const [loadingMessage, setLoadingMessage] = useState("Loading...")

  const pushLoading = (message?: string) => {
    setLoadingCount((c) => c + 1)
    if (message) setLoadingMessage(message)
  }

  const popLoading = () => {
    setLoadingCount((c) => {
      const next = Math.max(0, c - 1)
      if (next === 0) setLoadingMessage("")
      return next
    })
  }

  const handleSetLoading = (flag: boolean) => {
    if (flag) pushLoading()
    else popLoading()
  }

  // Collaboration
  const collab = useCollaboration()

  // Connect to collaboration room when a project is selected
  useEffect(() => {
    if (selectedProject && user) {
      const userId = actorForApi
      const userName = user?.name || actorForApi
      const userEmail = user?.email
      const projectKey = selectedProject.key || selectedProject.id
      collab.connect(projectKey, userId, userName, userEmail)
    }
    return () => {
      collab.disconnect()
    }
  }, [selectedProject, user])

  // Update status when editing changes
  useEffect(() => {
    if (activeRevisionId && selectedConcept) {
      collab.updateStatus("editing_revision", selectedConcept)
    } else if (selectedConcept) {
      collab.updateStatus("editing_concept", selectedConcept)
    } else {
      collab.updateStatus("browsing_graph")
    }
  }, [activeRevisionId, selectedConcept])

  const [nodeClickLoading, setNodeClickLoading] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; onConfirm: () => void; confirmLabel?: string; cancelLabel?: string } | null>(null)

  async function withLoading<T>(message: string, fn: () => Promise<T>): Promise<T> {
    pushLoading(message)

    try {
      return await fn()
    } finally {
      popLoading()
    }
  }

  useEffect(() => {
    if (!selectedProject || !user) return;
    const projectId = selectedProject.id

    // Reset all state tied to previous project
    setWorkItems(null)
    setWorkItemsInitialized(false)
    setSelectedWorkItem("")
    setSelectedWorkItemData(null)
    setConcepts(null)
    setConceptsInitialized(false)
    setSelectedConcept("")
    setActiveConcept(null)
    setEditorValue("")
    setActiveRevisionId(null)
    setRevisionsByConcept({})
    setBaseId(null)
    setTargetId(null)
    setDiffResult(null)
    setBaselines(undefined)
    setSelectedBaseline(null)
    setGraph(null)

    async function loadWorkItems() {
      try {
        const [wiRes, templatesRes] = await Promise.all([
          apiFetch(`${API}/projects/${projectId}/work-items`),
          apiFetch(`${API}/templates`),
        ])

        const wiData = wiRes.ok ? await wiRes.json() : []
        const templatesData = templatesRes.ok ? await templatesRes.json() : []

        setWorkItems(wiData)
        setTemplates(templatesData)
        setWorkItemsInitialized(true)

        if (wiData.length > 0) {
          setSelectedWorkItem(wiData[0].id)
        }
      } catch {
        setWorkItems([])
        setWorkItemsInitialized(true)
      }
    }

    loadWorkItems()
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
        setLoadingCount(0)
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
          phase: editConceptPhase || null,
          asil: editConceptAsil || null,
          sil: editConceptSil || null,
          pl: editConceptPl || null,
          standards: editConceptStandards.length > 0 ? editConceptStandards : null,
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
          phase: editWorkItemPhase || null,
          asil: editWorkItemAsil || null,
          sil: editWorkItemSil || null,
          pl: editWorkItemPl || null,
          standards: editWorkItemStandards.length > 0 ? editWorkItemStandards : null,
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

  const filteredTemplates = templates?.filter((wi) => {
    const search = filterText.trim().toLowerCase()
    const manifest = wi.templateManifest
    return !search || [
      wi.key,
      wi.name,
      wi.description || "",
      ...(wi.standards ?? []),
      ...(manifest?.tags ?? []),
      ...(manifest?.asilRange ?? []),
      ...(manifest?.silRange ?? []),
      ...(manifest?.plRange ?? []),
      ...(manifest?.phases ?? []),
      ...(manifest?.requiredConcepts ?? []),
      ...(manifest?.relationPatterns ?? []),
      ...(manifest?.composability?.conflicts ?? []),
      ...(manifest?.composability?.mergeKeys ?? []),
    ]
      .map((value) => value?.toString().toLowerCase() ?? "")
      .some((value) => value.includes(search))
  }) ?? []

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
        phase: phase || null,
        asil: asil || null,
        sil: sil || null,
        pl: pl || null,
        standards: standards.length > 0 ? standards : null,
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
      {collab && <CollaborationBanner
        connected={collab.connected}
        presences={collab.presences}
        roomId={collab.roomId}
        currentUserId={actorForApi}
      />}
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
                style={{ ...brutal.button, background: SemanticColor.SUCCESS }}
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

                style={{ ...brutal.button, background: SemanticColor.DANGER }}
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

      {showLicenseModal && (
        <LicenseModal
          apiFetch={apiFetch}
          onClose={() => setShowLicenseModal(false)}
        />
      )}

      {showAdminLicenses && (
        <AdminLicenses
          apiFetch={apiFetch}
          onClose={() => setShowAdminLicenses(false)}
        />
      )}

      {showCreateProjectModal && (
        <CreateProjectModal
          apiFetch={apiFetch}
          onCreated={refreshProjects}
          onClose={() => setShowCreateProjectModal(false)}
        />
      )}

      {showEditProjectModal && selectedProject && (
        <EditProjectModal
          apiFetch={apiFetch}
          projectId={selectedProject.id}
          currentKey={selectedProject.key}
          onUpdated={refreshProjects}
          onClose={() => setShowEditProjectModal(false)}
        />
      )}


      <header data-agent="top-header" className="top-header" style={!user && { padding: 80 } || {}}>
        <img src={logo} alt="Logo" className="logo" data-agent="logo" />

        <section style={{ flex: 1 }} data-agent="user-section">
          {auth0Enabled ? (
            <>
              <div className="title" style={{ display: "flex", alignItems: "center" }}>
                User
              </div>
              <Auth0UserBar
                isAdmin={isAdmin}
                onActorResolved={onActorResolved}
                onOpenLicense={() => setShowLicenseModal(true)}
                onOpenAdminLicenses={() => setShowAdminLicenses(true)}
              />
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
            <h1>Discover safety with WCGW Safety Suite</h1>

            <p>
              WCGW Safety Suite provides structured requirements management and lifecycle traceability
              for safety-critical systems. Aimed at manufacturing and safety engineering teams, it supports comprehensive documentation across ISO 26262, IEC 61508,
              and ISO 13849 frameworks, enabling rigorous capture of hazard analysis, safety goals, functional requirements,
              technical specifications, and validation evidence. The platform maintains artifact relationships throughout
              the development lifecycle, supporting change management, baseline creation, and AI-assisted creation of audit-ready
              documentation in preparing for certification and compliance.
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div className="title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    Projects
                    <InfoButton
                      title="Project structure"
                      content="In functional safety, a project is organized into work items that typically align with system boundaries or subsystems. Each work item encompasses interconnected safety concepts, including hazards, safety goals, and technical requirements."
                    />
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button
                      data-agent="btn-create-project"
                      onClick={() => setShowCreateProjectModal(true)}
                      style={{ ...brutal.button, fontSize: 10, padding: "4px 8px" }}
                    >
                      + New
                    </button>
                    {selectedProject && (
                      <>
                        <button
                          data-agent="btn-edit-project"
                          onClick={() => setShowEditProjectModal(true)}
                          style={{ ...brutal.button, fontSize: 10, padding: "4px 8px" }}
                        >
                          Edit
                        </button>
                        <button
                          data-agent="btn-leave-project"
                          onClick={async () => {
                            const ok = confirm(`Leave project "${selectedProject.key}"?`)
                            if (!ok) return
                            await withLoading("Leaving project...", async () => {
                              const res = await apiFetch(
                                `${API}/projects/${encodeURIComponent(selectedProject.key)}/users`,
                                { method: "DELETE" }
                              )
                              if (!res.ok) throw new Error("Failed to leave project")
                              await refreshProjects()
                            })
                          }}
                          style={{ ...brutal.button, background: SemanticColor.DANGER, fontSize: 10, padding: "4px 8px" }}
                        >
                          Leave
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {projects.length === 0 ? (
                  <p style={{ opacity: 0.7 }}>No projects. Create or join one.</p>
                ) : (
                  <div className="list-input" style={{ maxHeight: 160, overflow: "auto" }}>
                    {projects.map((p: Project) => (
                      <div
                        key={p.id}
                        className="option"
                        onClick={() => setSelectedProject(p)}
                        style={{
                          background: selectedProject?.id === p.id ? "rgb(255, 90, 0)" : undefined,
                          color: selectedProject?.id === p.id ? "#fff" : undefined,
                          cursor: "pointer",
                        }}
                      >
                        <div className="list-id">{p.key}</div>
                        <div className="list-tooltip">{p.id}</div>
                      </div>
                    ))}
                  </div>
                )}
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
                        No concepts under the selected work item.
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

                {selectedConcept && (
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

                {!!selectedConcept && (
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
                )}

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

                <section data-agent="baselines-section">
                  <div className="title" style={{ display: "flex", alignItems: "center" }}>
                    Baselines
                    <InfoButton
                      title="What is a baseline?"
                      content="A baseline is a fixed snapshot of selected revisions at a given point in time. In functional safety documentation it records an auditable version of requirements and concepts, supporting traceability, change control, and certification evidence."
                    />
                  </div>

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

                <hr />
                <section data-agent="import-concepts-section">
                  <div className="title" style={{ display: "flex", alignItems: "center" }}>
                    Import work item templates
                    <InfoButton
                      title="Work item templates"
                      content="Use the search box to filter templates by phase, standards, tags, required concepts, relations, or any other manifest field. Templates can be applied as a starting point for a new work item by importing the template's concepts and relationships into the current work item."
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
                      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                        <input
                          aria-label="Search templates"
                          placeholder="Search templates, tags, concepts, phases, standards..."
                          style={brutal.input}
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
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
                                  const action = () => { importConceptsFromTemplate(wi.id) }
                                  if (activeRevisionId) {
                                    setPendingConfirm({
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
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                        <strong>Conflicts:</strong>
                                        {(manifest.composability.conflicts ?? []).length > 0 ? (
                                          manifest.composability.conflicts.map((conflict) => (
                                            <span key={conflict} style={{ ...brutal.tag, backgroundColor: SemanticColor.DANGER }}>{conflict}</span>
                                          ))
                                        ) : (
                                          <span style={{ ...brutal.tag, backgroundColor: SemanticColor.SUCCESS }}>None</span>
                                        )}
                                      </div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                        <strong>Merge keys:</strong>
                                        {(manifest.composability.mergeKeys ?? []).length > 0 ? (
                                          manifest.composability.mergeKeys.map((key) => (
                                            <span key={key} style={{ ...brutal.tag, backgroundColor: SemanticColor.DOCUMENTATION }}>{key}</span>
                                          ))
                                        ) : (
                                          <span style={{ ...brutal.tag, backgroundColor: SemanticColor.SUCCESS }}>None</span>
                                        )}
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
                      onSetLoading={handleSetLoading}
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
                  <button data-agent="btn-save-revision" onClick={() => { revise() }} style={{ ...brutal.button, background: SemanticColor.SUCCESS }}>
                    Save revision
                  </button>
                  <button
                    data-agent="btn-cancel-revision"
                    onClick={() => { setActiveRevisionId(null); setEditorValue("") }}
                    style={{
                      ...brutal.button,
                      backgroundColor: SemanticColor.DANGER
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