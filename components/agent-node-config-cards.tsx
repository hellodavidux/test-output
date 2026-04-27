"use client"

import type { ComponentType } from "react"
import { useState } from "react"
import {
  ChevronDown,
  Database,
  List,
  Mic,
  Pencil,
  Plus,
  Rocket,
  Settings,
  Shield,
  Wand2,
  Wrench,
  Workflow,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function AgentInstructionsCard({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="w-fit border-b border-dashed border-gray-400 pb-0.5 text-xs font-medium text-gray-700">
        Instructions
      </span>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={6}
          className="min-h-[132px] w-full resize-none border-0 bg-white px-3 py-3 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        />
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/90 px-2 py-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 shadow-xs hover:bg-gray-50"
              aria-label="Add"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 shadow-xs hover:bg-gray-50"
            >
              <Wrench className="size-3.5" aria-hidden />
              Tools
            </button>
          </div>
          <div className="flex items-center text-gray-500">
            <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="List layout">
              <List className="size-3.5" aria-hidden />
            </button>
            <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="Assist">
              <Wand2 className="size-3.5" aria-hidden />
            </button>
            <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="Voice">
              <Mic className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgentPromptCard({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [view, setView] = useState<"edit" | "formatted">("edit")
  const trimmed = value.trim()
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <span className="w-fit border-b border-dashed border-gray-400 pb-0.5 text-xs font-medium text-gray-700">
          Prompt
        </span>
        <div className="flex shrink-0 rounded-lg bg-gray-100/95 p-0.5 text-[11px] font-medium text-gray-500">
          <button
            type="button"
            onClick={() => setView("edit")}
            className={cn(
              "rounded-md px-2.5 py-1 transition-colors",
              view === "edit" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-700",
            )}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setView("formatted")}
            className={cn(
              "rounded-md px-2.5 py-1 transition-colors",
              view === "formatted" ? "bg-white text-gray-900 shadow-sm" : "hover:text-gray-700",
            )}
          >
            Formatted
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {view === "edit" ? (
          <>
            <div className="flex min-h-[92px] flex-col gap-1.5 px-3 py-3">
              <p className="m-0 flex flex-wrap items-center gap-2 leading-none">
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100/95 px-2 py-1 text-xs font-medium text-gray-800">
                  <Pencil className="size-3 shrink-0 text-gray-600" aria-hidden />
                  Input
                </span>
              </p>
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="min-h-[72px] w-full min-w-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0"
              />
            </div>
            <div className="flex items-center justify-end gap-0.5 border-t border-gray-100 bg-gray-50/90 px-2 py-1.5 text-gray-500">
              <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="List layout">
                <List className="size-3.5" aria-hidden />
              </button>
              <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="Assist">
                <Wand2 className="size-3.5" aria-hidden />
              </button>
              <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="Voice">
                <Mic className="size-3.5" aria-hidden />
              </button>
            </div>
          </>
        ) : (
          <div className="min-h-[92px] space-y-2 border-b border-gray-100 px-3 py-3 text-sm leading-relaxed text-gray-700">
            <p className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100/95 px-2 py-1 text-xs font-medium text-gray-800">
                <Pencil className="size-3 shrink-0 text-gray-600" aria-hidden />
                Input
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-xs text-gray-500">referenced in prompt</span>
            </p>
            {trimmed ? (
              <p className="whitespace-pre-wrap rounded-md bg-gray-50/90 px-2.5 py-2 text-xs text-gray-800">{trimmed}</p>
            ) : (
              <p className="text-xs italic text-gray-400">No additional prompt text after the Input reference.</p>
            )}
          </div>
        )}
        {view === "formatted" ? (
          <div className="flex items-center justify-end gap-0.5 bg-gray-50/90 px-2 py-1.5 text-gray-500">
            <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="List layout">
              <List className="size-3.5" aria-hidden />
            </button>
            <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="Assist">
              <Wand2 className="size-3.5" aria-hidden />
            </button>
            <button type="button" className="rounded-md p-2 hover:bg-gray-200/60" aria-label="Voice">
              <Mic className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const AGENT_PLACEHOLDER_SECTIONS: { label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { label: "Knowledge Sources", Icon: Database },
  { label: "Tools", Icon: Wrench },
  { label: "Subflow Tools", Icon: Workflow },
  { label: "Main Settings", Icon: Settings },
  { label: "Advanced Settings", Icon: Rocket },
]

export function AgentPlaceholderSections() {
  return (
    <div className="flex flex-col gap-2">
      {AGENT_PLACEHOLDER_SECTIONS.map(({ label, Icon }) => (
        <div
          key={label}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-gray-600"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon className="size-4 shrink-0 text-gray-500" aria-hidden />
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
        </div>
      ))}
    </div>
  )
}

type GuardrailRule = {
  id: string
  label: string
  condition: string
  action: "block" | "flag" | "redact"
  enabled: boolean
}

const DEFAULT_GUARDRAIL_RULES: GuardrailRule[] = [
  { id: "gr-1", label: "Block PII in output", condition: "Output contains email, SSN, or phone number", action: "block", enabled: true },
  { id: "gr-2", label: "Flag refunds over $500", condition: "refund_amount > 500", action: "flag", enabled: true },
  { id: "gr-3", label: "Escalate disputes > 30 days", condition: "charge_age_days > 30", action: "flag", enabled: false },
]

const actionColors: Record<GuardrailRule["action"], string> = {
  block: "bg-red-50 text-red-600 border-red-200",
  flag: "bg-amber-50 text-amber-700 border-amber-200",
  redact: "bg-blue-50 text-blue-600 border-blue-200",
}

export function AgentGuardrailsSection() {
  const [rules, setRules] = useState<GuardrailRule[]>(DEFAULT_GUARDRAIL_RULES)
  const [expanded, setExpanded] = useState(false)

  const toggle = (id: string) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))

  const activeCount = rules.filter((r) => r.enabled).length

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2"
      >
        <span className="flex items-center gap-1.5 border-b border-dashed border-gray-400 pb-0.5 text-xs font-medium text-gray-700">
          <Shield className="size-3.5 shrink-0 text-gray-500" aria-hidden />
          Guardrails
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          {activeCount} active
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
        </span>
      </button>

      {expanded && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {rules.map((rule, i) => (
            <div
              key={rule.id}
              className={cn(
                "flex items-start gap-3 px-3 py-2.5 text-sm",
                i < rules.length - 1 && "border-b border-gray-100"
              )}
            >
              <Shield
                className={cn("mt-0.5 size-3.5 shrink-0", rule.enabled ? "text-gray-500" : "text-gray-300")}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium leading-none", rule.enabled ? "text-gray-800" : "text-gray-400")}>
                  {rule.label}
                </p>
                <p className="mt-1 truncate text-xs text-gray-400">{rule.condition}</p>
                <span className={cn("mt-1.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", actionColors[rule.action])}>
                  {rule.action}
                </span>
              </div>
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                onClick={() => toggle(rule.id)}
                className={cn(
                  "relative mt-0.5 inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
                  rule.enabled ? "bg-gray-800" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform",
                    rule.enabled ? "translate-x-3" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          ))}
          <div className="border-t border-gray-100 px-3 py-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              <Plus className="size-3.5" aria-hidden />
              Add rule
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
