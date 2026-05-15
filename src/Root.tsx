import { Auth0Provider } from "@auth0/auth0-react"
import { useEffect, useState, type ReactNode } from "react"
import App from "./App"
import { ApiFetchProvider, type ApiFetchFn } from "./lib/apiFetchContext"
import { Auth0ApiFetchBridge } from "./lib/Auth0ApiFetchBridge"

const API = import.meta.env.VITE_API_URL || ""

type Auth0PublicConfig = {
  domain: string
  clientId: string
  audience: string
}

type RootState =
  | { status: "loading" }
  | { status: "mock" }
  | { status: "auth0"; cfg: Auth0PublicConfig }

function normalizeAuthConfig(json: Record<string, unknown>): Auth0PublicConfig | null {
  if (json.disabled === true || json.auth0Disabled === true) return null
  if (
    json.enabled === false ||
    json.authEnabled === false ||
    json.auth0Enabled === false
  ) {
    return null
  }

  let domain =
    (typeof json.domain === "string" && json.domain) ||
    (typeof json.auth0Domain === "string" && json.auth0Domain) ||
    ""

  if (!domain && typeof json.issuer === "string" && json.issuer) {
    domain = json.issuer.replace(/^https?:\/\//, "").replace(/\/$/, "")
  }

  const clientId =
    (typeof json.clientId === "string" && json.clientId) ||
    (typeof json.client_id === "string" && json.client_id) ||
    ""

  const audience =
    (typeof json.audience === "string" && json.audience) ||
    (typeof json.apiAudience === "string" && json.apiAudience) ||
    ""

  if (!domain || !clientId || !audience) return null
  return { domain, clientId, audience }
}

async function loadAuthConfig(): Promise<Auth0PublicConfig | null> {
  if (!API) return null
  const base = API.replace(/\/$/, "")
  try {
    const res = await fetch(`${base}/auth/config`)
    if (!res.ok) return null
    const json = (await res.json()) as Record<string, unknown>
    return normalizeAuthConfig(json)
  } catch {
    return null
  }
}

function MockShell({ children }: { children: ReactNode }) {
  const plainFetch: ApiFetchFn = (input, init) => fetch(input, init)
  return (
    <ApiFetchProvider value={plainFetch}>{children}</ApiFetchProvider>
  )
}

export default function Root() {
  const [state, setState] = useState<RootState>({ status: "loading" })

  useEffect(() => {
    loadAuthConfig().then((cfg) => {
      if (cfg) setState({ status: "auth0", cfg })
      else setState({ status: "mock" })
    })
  }, [])

  if (state.status === "loading") {
    return (
      <div style={{ padding: 24, fontFamily: "monospace" }}>Loading…</div>
    )
  }

  if (state.status === "mock") {
    return (
      <MockShell>
        <App auth0Enabled={false} />
      </MockShell>
    )
  }

  const { domain, clientId, audience } = state.cfg
  const redirectUri = window.location.origin

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        audience,
        redirect_uri: redirectUri,
      }}
      cacheLocation="localstorage"
    >
      <Auth0ApiFetchBridge audience={audience}>
        <App auth0Enabled />
      </Auth0ApiFetchBridge>
    </Auth0Provider>
  )
}
