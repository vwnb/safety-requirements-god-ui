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
      className="modal"
    >
      <div
        data-agent="modal-content"
        ref={ref}
        className="modal-content"
      >
        {title && <div className="title" style={{ marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
