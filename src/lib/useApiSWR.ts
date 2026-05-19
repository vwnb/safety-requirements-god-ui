import useSWR, { useSWRConfig, type SWRConfiguration, type Key, type SWRResponse } from "swr"
import { useApiFetch } from "./apiFetchContext"

const API = import.meta.env.VITE_API_URL || ""

export function useApiSWR<D = any>(
  path: string | null,
  config?: SWRConfiguration<D>
): SWRResponse<D, Error> & { data: D | undefined } {
  const apiFetch = useApiFetch()
  const fetcher = (url: string) =>
    apiFetch(url).then((r) => {
      if (!r.ok) throw new Error(`SWR ${r.status} on ${url}`)
      return r.json()
    })
  const key: Key = path ? `${API}${path}` : null
  return useSWR<D>(key, fetcher, {
    revalidateOnFocus: false,
    ...config,
  })
}

export function getApiKey(path: string) {
  return `${API}${path}`
}

export function useRevalidate() {
  const { mutate } = useSWRConfig()
  return { mutate }
}