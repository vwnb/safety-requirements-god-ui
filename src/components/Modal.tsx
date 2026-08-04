import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"

export default function Modal({
  title,
  children,
  onClose,
  width,
}: {
  title?: string
  children: ReactNode
  onClose: () => void
  width?: number | string
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
        style={width !== undefined ? { maxWidth: width, width: width } : undefined}
      >
        {title && <div className="title" style={{ marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
