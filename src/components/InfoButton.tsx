import { useState } from "react"
import Modal from "./Modal"
import { brutal } from "../App"

export function InfoButton({ title, content }: { title: string, content: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span
        style={{ cursor: "pointer", marginLeft: "8px", verticalAlign: "middle" }}
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
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setOpen(false)}
              style={brutal.button}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
