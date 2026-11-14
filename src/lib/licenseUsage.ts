// Types and formatting for GET /admin/licenses/usage.

export type UserUsage = {
  userId: string
  llm: {
    calls: number
    failedCalls: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    callsWithoutCost: number
  }
  paid: {
    settled: number
    creditsRedeemed: number
    notCharged: number
    inProgress: number
    needsReconciliation: number
  }
  nevermined: { payer: string; planId: string; balance: string | null; balanceAt: string | null }[]
}

export type UsageResponse = { window: { days: number; since: string }; users: UserUsage[] }

export const USAGE_WINDOWS = [7, 30, 90] as const

export function formatUsd(value: number): string {
  if (value === 0) return "$0"
  if (value < 0.01) return `$${value.toFixed(4)}`
  return `$${value.toFixed(2)}`
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}
