import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

export default function Modal({
  title,
  children,
  onClose,
}: {
  title?: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const modalContent = (
    <div
      data-agent="modal-overlay"
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
        data-agent="modal-content"
        ref={ref}
        style={{
          background: "rgb(233, 237, 233)",
          border: "2px solid black",
          borderLeftWidth: 6,
          borderRadius: 8,
          fontFamily: "monospace",
          padding: "2rem",
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {title && <div className="title" style={{ marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
