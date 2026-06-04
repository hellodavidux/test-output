/** Builds the Experiment table seed from Run progress → Evaluate / Compare. */

export type ExperimentRunSeed = {
  runId: string
  input: string
  expected: string
  /** Run progress → Compare: open the “Workflow variant” drawer on Experiment. */
  openWorkflowVariantDrawer?: boolean
  /** Ensures Experiment remounts so Compare can reopen the drawer for the same run. */
  intentNonce?: number
}

export function buildExperimentSeedFromPrefill(prefill: {
  runId: string
  caseInput?: string
  caseExpected?: string
  openWorkflowVariantDrawer?: boolean
}): ExperimentRunSeed {
  const openDrawer = prefill.openWorkflowVariantDrawer === true
  return {
    runId: prefill.runId,
    input:
      prefill.caseInput?.trim() ||
      `Workflow run (test case)\n${prefill.runId}`,
    expected: prefill.caseExpected ?? "",
    openWorkflowVariantDrawer: openDrawer,
    intentNonce: openDrawer ? Date.now() : undefined,
  }
}
