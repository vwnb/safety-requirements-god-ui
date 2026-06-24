import { useState } from "react"
import Modal from "./Modal"

export function InfoButton({ title, content }: { title: string, content: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span
        className="cursor-pointer"
        style={{ marginLeft: "8px", verticalAlign: "middle" }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        title={`More info about ${title}`}
      >
        ℹ️
      </span>
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <article>
            <p>{content}</p>
          </article>
          <div className="mt-16">
            <button
              onClick={() => setOpen(false)}
              className="license-value"
              style={{ opacity: 1, cursor: 'pointer', background: 'white', border: '2px solid black', borderLeftWidth: '6px', borderRadius: 4, padding: '8px 16px', margin: '8px 0', fontFamily: 'monospace', fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
