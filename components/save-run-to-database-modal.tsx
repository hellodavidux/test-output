"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/** Matches Experiment mock datasets (evaluator) — prototype only */
const MOCK_DATASETS = [
  { id: "ds-1", name: "Billing disputes" },
  { id: "ds-2", name: "Technical issues" },
  { id: "ds-3", name: "Account & access" },
]

const LABEL_OPTIONS = ["Good", "Failure", "Edge case"] as const

export type SaveRunToDatabaseModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  runId?: string
}

export function SaveRunToDatabaseModal({
  open,
  onOpenChange,
  runId,
}: SaveRunToDatabaseModalProps) {
  const [datasetMode, setDatasetMode] = useState<"existing" | "new">("existing")
  const [existingDatasetId, setExistingDatasetId] = useState(MOCK_DATASETS[0].id)
  const [newDatasetName, setNewDatasetName] = useState("")
  const [runName, setRunName] = useState("")
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!open) return
    const short =
      runId && runId.length > 8 ? runId.slice(0, 8) : runId ?? `run-${Date.now().toString(36)}`
    setRunName(`Test case ${short}`)
    setDatasetMode("existing")
    setExistingDatasetId(MOCK_DATASETS[0].id)
    setNewDatasetName("")
    setSelectedLabels(new Set())
  }, [open, runId])

  function toggleLabel(label: string) {
    setSelectedLabels((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function handleSave() {
    const trimmedRun = runName.trim()
    if (!trimmedRun) {
      toast.error("Please name this test case run.")
      return
    }
    if (datasetMode === "new" && !newDatasetName.trim()) {
      toast.error("Please enter a name for the new dataset.")
      return
    }
    const datasetSummary =
      datasetMode === "existing"
        ? MOCK_DATASETS.find((d) => d.id === existingDatasetId)?.name ?? existingDatasetId
        : newDatasetName.trim()
    const labelsSummary =
      selectedLabels.size > 0 ? ` · ${[...selectedLabels].join(", ")}` : ""
    toast.success("Saved to Dataset", {
      description: `“${trimmedRun}” → ${datasetSummary}${labelsSummary} (prototype — not persisted).`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-save-run-modal="">
        <DialogHeader>
          <DialogTitle>Save run to Dataset</DialogTitle>
          <DialogDescription>
            Save this run’s outputs to a dataset. Name the test case and add labels so you can filter
            and revisit it later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="save-run-name">Test case run name</Label>
            <Input
              id="save-run-name"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder="e.g. Billing dispute — double charge"
            />
          </div>

          <div className="grid gap-3">
            <Label>Dataset</Label>
            <RadioGroup
              value={datasetMode}
              onValueChange={(v) => setDatasetMode(v as "existing" | "new")}
              className="grid gap-3"
            >
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="existing" id="ds-existing" className="mt-0.5" />
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="ds-existing" className="font-medium cursor-pointer">
                    Existing dataset
                  </Label>
                  {datasetMode === "existing" && (
                    <Select value={existingDatasetId} onValueChange={setExistingDatasetId}>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Choose a dataset" />
                      </SelectTrigger>
                      <SelectContent position="popper" align="start">
                        {MOCK_DATASETS.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                <RadioGroupItem value="new" id="ds-new" className="mt-0.5" />
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="ds-new" className="font-medium cursor-pointer">
                    New dataset
                  </Label>
                  {datasetMode === "new" && (
                    <Input
                      value={newDatasetName}
                      onChange={(e) => setNewDatasetName(e.target.value)}
                      placeholder="e.g. Q2 escalation runs"
                    />
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label>Labels</Label>
            <p className="text-xs text-muted-foreground">Select any that apply — helps categorize this run.</p>
            <div className="flex flex-wrap gap-2">
              {LABEL_OPTIONS.map((label) => {
                const on = selectedLabels.has(label)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleLabel(label)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      on
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
