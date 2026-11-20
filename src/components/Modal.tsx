import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import Panel from "./Panel"

export default function Modal({
  title,
  children,
  onClose,
  width,
  className,
}: {
  title?: string
  children: ReactNode
  onClose: () => void
  width?: number | string
  className?: string
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
      <Panel
        dataAgent="modal-content"
        ref={ref}
        className={className ? `modal-content ${className}` : "modal-content"}
        style={width !== undefined ? { maxWidth: width, width: "100%" } : undefined}
      >
        {title && <div className="title" style={{ marginBottom: 16 }}>{title}</div>}
        {children}
      </Panel>
    </div>
  )

  return createPortal(modalContent, document.body)
}
