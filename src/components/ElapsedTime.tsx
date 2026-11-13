import { useEffect, useState } from "react"

export default function ElapsedTime() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const startedAt = performance.now()
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((performance.now() - startedAt) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="text-sm opacity-70 mt-8" data-agent="loading-elapsed-time" role="timer">
      Elapsed: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </div>
  )
}
