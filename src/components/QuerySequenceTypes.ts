export type QuerySequenceStepPayload = {
  type: string
  sourceRevisionId: string | null
}

export type QuerySequenceStepResult = {
  queryType?: string
  sourceRevisionId?: string | null
  nodes?: Array<{ id: string; conceptId?: string; depth?: number | null }>
  edges?: Array<{ id: string; source?: string; target?: string }>
  explanations?: { title: string; content: string } | null
}

export type QuerySequenceStep = {
  payload: QuerySequenceStepPayload
  result: QuerySequenceStepResult
}

export type QuerySequenceResult = {
  goal?: string
  steps: QuerySequenceStep[]
}
