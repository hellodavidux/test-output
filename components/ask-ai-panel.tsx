"use client"

import React from "react"
import { Activity, History, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const SUGGESTIONS = [
  "Draft auto-eval criteria for this workflow from recent failures.",
  "Suggest rubric fixes where scores disagree with human review.",
  "Propose signals to catch regressions before they hit production.",
  "Turn top evaluator errors into a checklist for the next run.",
]

export function AskAiPanel({
  className,
  onClose,
}: {
  className?: string
  onClose: () => void
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-[min(380px,38vw)] shrink-0 flex-col overflow-hidden bg-transparent",
        className
      )}
    >
      <div className="flex h-12 items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50 text-xs font-medium">
            AI
          </div>
          <span className="text-sm font-medium text-foreground">New chat</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="New conversation">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="History">
            <History className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close assistant">
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/80 bg-gradient-to-br from-muted/80 to-muted/30 shadow-sm">
          <svg viewBox="0 0 48 48" className="h-9 w-9 text-foreground/70" aria-hidden>
            <path
              fill="currentColor"
              opacity={0.35}
              d="M12 32 L24 38 L36 32 L36 20 L24 26 L12 20 Z"
            />
            <path
              fill="currentColor"
              opacity={0.55}
              d="M12 20 L24 14 L36 20 L24 26 Z"
            />
            <path
              fill="currentColor"
              opacity={0.75}
              d="M18 22 L24 18 L30 22 L24 25 Z"
            />
          </svg>
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-medium text-foreground">Hey David, how can I help you?</p>
          <p className="text-sm text-muted-foreground">Ask questions about anything.</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 px-3 py-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-3">
        <div className="relative rounded-xl border border-border bg-white p-2">
          <Textarea
            placeholder="Ask anything..."
            className="min-h-[72px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 pr-12"
          />
          <Button
            type="button"
            size="icon"
            className="absolute bottom-2.5 right-2.5 h-9 w-9 rounded-full bg-foreground text-background shadow-sm hover:bg-foreground/90"
            aria-label="Send"
          >
            <Activity className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
