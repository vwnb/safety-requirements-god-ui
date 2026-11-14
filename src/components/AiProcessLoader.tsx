import AiLabel from "./AiLabel"
import AiProcessCanvas from "./AiProcessCanvas"
import ElapsedTime from "./ElapsedTime"

export default function AiProcessLoader({
  message,
  boxed = true,
}: {
  message: string
  boxed?: boolean
}) {
  return (
    <div
      className="loading-message"
      data-agent="loading-message"
      style={{
        border: boxed ? "2px solid black" : "none",
        background: boxed ? "rgb(233,237,233)" : "transparent",
        padding: boxed ? 20 : 0,
        fontSize: 16,
        display: "grid",
        gap: 10,
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div
        data-agent="ai-process-message"
        style={{ lineHeight: 1.35, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
      >
        {boxed && <AiLabel variant="basic" height={22} />}
        <span>{message}</span>
      </div>
      <AiProcessCanvas />
      <ElapsedTime />
    </div>
  )
}
