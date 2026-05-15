import { useAuth0 } from "@auth0/auth0-react"
import { useMemo, type ReactNode } from "react"
import { ApiFetchProvider, type ApiFetchFn } from "./apiFetchContext"

export function Auth0ApiFetchBridge({
  audience,
  children,
}: {
  audience: string
  children: ReactNode
}) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()

  const apiFetch = useMemo<ApiFetchFn>(() => {
    return async (input, init) => {
      const headers = new Headers(init?.headers)
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently({
            authorizationParams: { audience },
          })
          headers.set("Authorization", `Bearer ${token}`)
        } catch {
          // Request proceeds without Bearer; API returns 401 if required.
        }
      }
      return fetch(input, { ...init, headers })
    }
  }, [audience, getAccessTokenSilently, isAuthenticated])

  return <ApiFetchProvider value={apiFetch}>{children}</ApiFetchProvider>
}
