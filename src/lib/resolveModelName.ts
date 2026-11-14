// Resolves the LLM provider/model the authenticated user is currently on, so
// loading messages can name it. Falls back to "LLM" when unavailable.
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export async function resolveModelName(apiFetch: FetchLike, api: string): Promise<string> {
  let modelName = "LLM"
  try {
    const [optsRes, meRes] = await Promise.all([
      apiFetch(`${api}/user-settings/available`),
      apiFetch(`${api}/user-settings/me`),
    ])
    let availableOptions: { key: string; defaultModel: string }[] = []
    if (optsRes.ok) {
      const optsData = await optsRes.json()
      availableOptions = (optsData as { providers?: { key: string; defaultModel: string }[] }).providers ?? []
    }
    let provider: string | null = null
    let model: string | null = null
    if (meRes.ok) {
      const meData = (await meRes.json()) as { provider?: string | null; model?: string | null } | null
      if (meData) {
        provider = meData.provider ?? null
        model = meData.model ?? null
      }
    }
    if (provider !== null) {
      const opt = availableOptions.find((o) => o.key === provider)
      modelName = model ?? opt?.defaultModel ?? provider
    }
  } catch {
    // fall back to generic label
  }
  return modelName
}
