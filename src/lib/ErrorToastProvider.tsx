import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { brutal } from "../App"

type ErrorToast = {
  id: string
  title: string
  message: string
}

type ErrorToastContextValue = {
  pushError: (error: Omit<ErrorToast, "id">) => void
}

const ErrorToastContext =
  createContext<ErrorToastContextValue | null>(
    null,
  )

export function ErrorToastProvider({
  children,
}: {
  children: ReactNode
}) {
  const [errors, setErrors] = useState<
    ErrorToast[]
  >([])

  const removeError = useCallback((id: string) => {
    setErrors((prev) =>
      prev.filter((e) => e.id !== id),
    )
  }, [])

  const pushError = useCallback(
    ({
      title,
      message,
    }: Omit<ErrorToast, "id">) => {
      const id = crypto.randomUUID()

      setErrors((prev) => [
        ...prev,
        {
          id,
          title,
          message,
        },
      ])

      window.setTimeout(() => {
        removeError(id)
      }, 10000)
    },
    [removeError],
  )

  const value = useMemo(
    () => ({
      pushError,
    }),
    [pushError],
  )

  return (
    <ErrorToastContext.Provider value={value}>
      {children}

      <div
        style={{
          position: "fixed",
          top: 40,
          right: 40,
          left: 40,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          zIndex: 99999,
        }}
      >
        {errors.map((error) => (
          <div key={error.id} style={{ ...brutal.box, background: "rgb(255, 90, 0)", color: "white" }}>
            {error.message}
          </div>
        ))}
      </div>
    </ErrorToastContext.Provider>
  )
}

export function useErrorToasts() {
  const context = useContext(
    ErrorToastContext,
  )

  if (!context) {
    throw new Error(
      "useErrorToasts must be used within ErrorToastProvider",
    )
  }

  return context
}