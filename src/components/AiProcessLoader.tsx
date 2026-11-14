import AiLabel from "./AiLabel"
import AiProcessCanvas from "./AiProcessCanvas"
import ElapsedTime from "./ElapsedTime"

export default function AiProcessLoader({ message }: { message: string }) {
  return (
    <div
      className="loading-message"
      data-agent="loading-message"
      style={{
        border: "2px solid black",
        background: "rgb(255,255,255)",
        padding: 18,
        fontSize: 16,
        display: "grid",
        gap: 10,
        width: "min(460px, 100%)",
        boxSizing: "border-box",
      }}
    >
      <div
        data-agent="ai-process-message"
        style={{ lineHeight: 1.35, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
      >
        <AiLabel variant="basic" height={22} />
        <span>{message}</span>
      </div>
      <AiProcessCanvas />
      <ElapsedTime />
    </div>
  )
}
