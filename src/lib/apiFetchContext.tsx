import { createContext, useContext, type ReactNode } from "react"

export type ApiFetchFn = (input: string | URL, init?: RequestInit) => Promise<Response>

const defaultFetch: ApiFetchFn = (input, init) => fetch(input, init)

const ApiFetchContext = createContext<ApiFetchFn>(defaultFetch)

export function ApiFetchProvider({
  value,
  children,
}: {
  value: ApiFetchFn
  children: ReactNode
}) {
  return <ApiFetchContext.Provider value={value}>{children}</ApiFetchContext.Provider>
}

export function useApiFetch() {
  return useContext(ApiFetchContext)
}
