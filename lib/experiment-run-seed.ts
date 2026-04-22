/** Builds the Experiment table seed from Run progress → Evaluate / Compare. */

export type ExperimentRunSeed = {
  runId: string
  input: string
  expected: string
}

export function buildExperimentSeedFromPrefill(prefill: {
  runId: string
  caseInput?: string
  caseExpected?: string
}): ExperimentRunSeed {
  return {
    runId: prefill.runId,
    input:
      prefill.caseInput?.trim() ||
      `Workflow run (test case)\n${prefill.runId}`,
    expected: prefill.caseExpected ?? "",
  }
}
