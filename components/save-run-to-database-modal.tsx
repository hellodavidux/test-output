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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Plus } from "lucide-react"
import { toast } from "sonner"

const MOCK_DATASETS = [
  { id: "ds-1", name: "Billing disputes" },
  { id: "ds-2", name: "Technical issues" },
  { id: "ds-3", name: "Account & access" },
]

export type SaveRunToDatabaseModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  runId?: string
}

export function SaveRunToDatabaseModal({
  open,
  onOpenChange,
}: SaveRunToDatabaseModalProps) {
  const [datasets, setDatasets] = useState(MOCK_DATASETS)
  const [mode, setMode] = useState<"pick" | "new">("pick")
  const [selectedId, setSelectedId] = useState(MOCK_DATASETS[0].id)
  const [newName, setNewName] = useState("")
  const [rowLabel, setRowLabel] = useState<"good" | "fail" | "edge">("good")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!open) return
    setMode("pick")
    setSelectedId(datasets[0]?.id ?? "")
    setNewName("")
    setRowLabel("good")
    setNotes("")
  }, [open])

  function handleSave() {
    let targetName: string
    if (mode === "new") {
      const trimmed = newName.trim()
      if (!trimmed) {
        toast.error("Enter a name for the new dataset")
        return
      }
      const id = `ds-${Date.now()}`
      setDatasets((prev) => [...prev, { id, name: trimmed }])
      targetName = trimmed
    } else {
      const ds = datasets.find((d) => d.id === selectedId)
      if (!ds) {
        toast.error("Select a dataset")
        return
      }
      targetName = ds.name
    }
    const labelPretty = rowLabel === "good" ? "Good" : rowLabel === "fail" ? "Fail" : "Edge"
    toast.success("Saved to dataset", {
      description: `Added to "${targetName}" as ${labelPretty}.${notes.trim() ? ` Notes: ${notes.trim()}` : ""}`,
      duration: 10_000,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-auto gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-1.5 bg-white">
          <DialogTitle>Save Run to dataset</DialogTitle>
          <DialogDescription>
            Choose a dataset or create one, set a label, and add optional notes.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 bg-white">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dataset</Label>
            {mode === "pick" ? (
              <Select
                value={selectedId}
                onValueChange={(v) => {
                  if (v === "__new__") {
                    setMode("new")
                    setNewName("")
                  } else {
                    setSelectedId(v)
                  }
                }}
              >
                <SelectTrigger size="sm" className="w-full min-h-9">
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="__new__">
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      New dataset
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1 min-w-0 h-9"
                  placeholder="New dataset name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 px-2 text-muted-foreground"
                  onClick={() => { setMode("pick"); setNewName("") }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Label</Label>
            <ToggleGroup
              type="single"
              value={rowLabel}
              onValueChange={(v) => {
                if (v) setRowLabel(v as "good" | "fail" | "edge")
              }}
              variant="outline"
              size="sm"
              className="w-full justify-stretch"
            >
              <ToggleGroupItem value="good" className="flex-1">
                Good
              </ToggleGroupItem>
              <ToggleGroupItem value="fail" className="flex-1">
                Fail
              </ToggleGroupItem>
              <ToggleGroupItem value="edge" className="flex-1">
                Edge
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Notes (optional)</Label>
            <Textarea
              placeholder="Add context for this row…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[88px] resize-y"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/60 gap-2 sm:gap-2 sm:justify-end bg-muted/40">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
