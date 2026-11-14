import AiLabel from "./AiLabel"
import AiProcessCanvas from "./AiProcessCanvas"
import ElapsedTime from "./ElapsedTime"
import Panel from "./Panel"

export default function AiProcessLoader({
  message,
  boxed = true,
}: {
  message: string
  boxed?: boolean
}) {
  const content = (
    <>
      <div
        data-agent="ai-process-message"
        style={{ lineHeight: 1.35, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
      >
        {boxed && <AiLabel variant="basic" height={22} />}
        <span>{message}</span>
      </div>
      <AiProcessCanvas />
      <ElapsedTime />
    </>
  )

  const layout = { display: "grid", gap: 10, width: "100%", maxWidth: 480, margin: "0 auto" } as const

  if (!boxed) {
    return (
      <div className="loading-message" data-agent="loading-message" style={layout}>
        {content}
      </div>
    )
  }

  return (
    <Panel className="loading-message" dataAgent="loading-message" style={layout}>
      {content}
    </Panel>
  )
}
