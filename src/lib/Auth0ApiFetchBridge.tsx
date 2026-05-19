import { useAuth0 } from "@auth0/auth0-react"
import { useMemo, type ReactNode } from "react"
import { ApiFetchProvider, type ApiFetchFn } from "./apiFetchContext"
import { useErrorToasts } from "./ErrorToastProvider.tsx"

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function Auth0ApiFetchBridge({
  audience,
  children,
}: {
  audience: string
  children: ReactNode
}) {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()

  const { pushError } = useErrorToasts()

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
          pushError({
            title: "Authentication Error",
            message:
              "Failed to authenticate your session. Please refresh and try again.",
          })
        }
      }

      let response: Response

      try {
        response = await fetch(input, {
          ...init,
          headers,
        })
      } catch {
        pushError({
          title: "Network Error",
          message:
            "Unable to reach the server. Check your internet connection.",
        })

        throw new ApiError(
          0,
          "Network request failed",
        )
      }

      if (response.ok) {
        return response
      }

      switch (response.status) {
        case 400:
          pushError({
            title: "Bad Request",
            message:
              "The request could not be processed.",
          })
          break

        case 401:
          pushError({
            title: "Unauthorized",
            message:
              "Your session has expired. Please sign in again.",
          })
          setTimeout(() => {
            window.location.href = import.meta.env.VITE_API_URL + "/auth/logout"
          }, 3000)
          break

        case 403:
          pushError({
            title: "Access Denied",
            message:
              "You do not have permission to perform this action.",
          })
          break

        case 404:
          pushError({
            title: "Not Found",
            message:
              "The requested resource could not be found.",
          })
          break

        case 429:
          pushError({
            title: "Rate Limited",
            message:
              "Too many requests. Please wait a moment and try again.",
          })
          break

        default:
          if (response.status >= 500) {
            pushError({
              title: "Server Error",
              message:
                "An internal server error occurred.",
            })
          } else {
            pushError({
              title: "Request Failed",
              message:
                "The operation could not be completed.",
            })
          }
      }

      throw new ApiError(
        response.status,
        response.statusText,
      )
    }
  }, [
    audience,
    getAccessTokenSilently,
    isAuthenticated,
    pushError,
  ])

  return (
    <ApiFetchProvider value={apiFetch}>
      {children}
    </ApiFetchProvider>
  )
}