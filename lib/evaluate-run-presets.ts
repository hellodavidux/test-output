/** Mock evaluation row shown in Analytics run sidebar */
export type RunEvaluationSummary = {
  evaluatorName: string
  score: number
  summary: string
}

/** Label strings for mock run rows — shared with Analytics defaults */
export const EV_RESPONSE = "Response accuracy"
export const EV_TONE = "Tone & empathy"
export const EV_RESOLUTION = "Resolution completeness"
export const EV_ESCALATION = "Escalation detection rate"

export type EvalRunPreset = {
  id: string
  evaluatorName: string
  subtitle: string
  evaluatedNodeLabel: string
  score: number
  summary: string
}

/** Selectable presets when the user runs Evaluate from the UI (prototype). */
export const EVAL_RUN_PRESET_LIST: EvalRunPreset[] = [
  {
    id: "preset-tone",
    evaluatorName: EV_TONE,
    subtitle: "LLM judge · Draft Response",
    evaluatedNodeLabel: "Draft Response",
    score: 82,
    summary:
      "Tone remains professional with appropriate empathy; pacing is clear and the closing aligns with support standards.",
  },
  {
    id: "preset-response",
    evaluatorName: EV_RESPONSE,
    subtitle: "LLM judge · Draft Response",
    evaluatedNodeLabel: "Draft Response",
    score: 71,
    summary:
      "Factual alignment is strong on billed amounts and dates; one secondary detail in the timeline is slightly misstated compared to the source transcript.",
  },
  {
    id: "preset-resolution",
    evaluatorName: EV_RESOLUTION,
    subtitle: "Rubric · Send Reply",
    evaluatedNodeLabel: "Send Reply",
    score: 65,
    summary:
      "The agent proposes a resolution path and next steps, though follow-ups for edge cases (policy exceptions) are thin.",
  },
  {
    id: "preset-escalation",
    evaluatorName: EV_ESCALATION,
    subtitle: "Policy trace · Escalation Router",
    evaluatedNodeLabel: "Escalation Router",
    score: 52,
    summary:
      "The run should have routed to human billing review for a charge older than 30 days, but the agent issued a self-serve refund form instead. The Escalation Router node did not fire despite explicit policy thresholds in the workflow context. Reliability for this evaluator is below the bar you would want for production billing disputes.",
  },
]
