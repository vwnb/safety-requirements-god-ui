// Per-user usage from GET /admin/licenses/usage: real LLM provider calls,
// Nevermined paid operations and the payer accounts bound to the user. Shown
// next to the license counter, which counts licensed operations instead.

import { formatUsd, shortAddress, type UserUsage } from "../lib/licenseUsage"

const number = new Intl.NumberFormat("en-US")

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="license-form-row">
      <div className="license-label" style={{ width: 100 }}>{label}</div>
      <div className="license-value">{children}</div>
    </div>
  )
}

const hint = { marginLeft: 8, fontSize: 11, opacity: 0.7 } as const

export function LicenseUsageRows({ usage, days }: { usage: UserUsage | undefined; days: number }) {
  if (!usage) {
    return <Row label="Usage">No LLM calls or paid calls in the last {days} days</Row>
  }
  const { llm, paid, nevermined } = usage
  return (
    <>
      <Row label="Provider calls">
        {number.format(llm.calls)}
        <span style={hint}>
          {llm.failedCalls > 0 ? `${number.format(llm.failedCalls)} failed · ` : ""}last {days} days, retries included
        </span>
      </Row>
      <Row label="Tokens">
        {number.format(llm.totalTokens)}
        <span style={hint}>{number.format(llm.inputTokens)} in · {number.format(llm.outputTokens)} out</span>
      </Row>
      <Row label="LLM cost">
        {formatUsd(llm.costUsd)}
        {llm.callsWithoutCost > 0 && (
          <span style={hint} title="The provider reported no cost for these calls, so the total is a lower bound">
            {number.format(llm.callsWithoutCost)} calls without a reported cost
          </span>
        )}
      </Row>
      {(paid.settled + paid.notCharged + paid.inProgress + paid.needsReconciliation > 0) && (
        <Row label="Paid calls">
          {number.format(paid.settled)} charged · {number.format(paid.creditsRedeemed)} credits
          <span style={hint}>
            {[
              paid.notCharged > 0 && `${number.format(paid.notCharged)} not charged`,
              paid.inProgress > 0 && `${number.format(paid.inProgress)} in progress`,
            ].filter(Boolean).join(" · ")}
          </span>
        </Row>
      )}
      {nevermined.map((entitlement) => (
        <Row key={`${entitlement.planId}:${entitlement.payer}`} label="Nevermined">
          <span title={entitlement.payer} style={{ fontFamily: "monospace" }}>{shortAddress(entitlement.payer)}</span>
          {" · "}
          {entitlement.balance === null ? "balance unknown" : `${number.format(Number(entitlement.balance))} credits left`}
          {entitlement.balanceAt && (
            <span style={hint}>as of {new Date(entitlement.balanceAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          )}
        </Row>
      ))}
    </>
  )
}
