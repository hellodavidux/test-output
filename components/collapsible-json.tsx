"use client"

import React, { useState, useCallback } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

function tryParseJson(text: string): object {
  const trimmed = text.trim()
  if (!trimmed) return {}
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === "object" && parsed !== null ? parsed : { value: parsed }
  } catch {
    return { message: text }
  }
}

const keyClass = "text-amber-700 dark:text-amber-400"
const stringClass = "text-emerald-700 dark:text-emerald-400"
const numberClass = "text-blue-600 dark:text-blue-400"
const nullClass = "text-muted-foreground"

export function CollapsibleJsonView({
  text,
  className,
  defaultExpandedDepth = 1,
}: {
  text: string
  className?: string
  defaultExpandedDepth?: number
}) {
  const obj = tryParseJson(text)
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>(["root"])
    const addAtDepth = (path: string, depth: number) => {
      if (depth <= 0) return
      s.add(path)
      const val = path === "root" ? obj : getByPath(obj, path)
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        Object.keys(val).forEach((k) => addAtDepth(path ? `${path}.${k}` : k, depth - 1))
      } else if (Array.isArray(val)) {
        val.forEach((_, i) => addAtDepth(`${path}.${i}`, depth - 1))
      }
    }
    addAtDepth("root", defaultExpandedDepth)
    return s
  })

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  function getByPath(o: unknown, path: string): unknown {
    if (path === "root") return o
    const parts = path.startsWith("root.") ? path.slice(5).split(".") : path.split(".")
    let cur: unknown = o
    for (const p of parts) {
      if (cur === null || typeof cur !== "object") return undefined
      cur = (cur as Record<string, unknown>)[p]
    }
    return cur
  }

  function render(path: string, key: string | null, value: unknown, depth: number): React.ReactNode {
    const indent = depth * 14

    if (value === null) {
      return (
        <div key={path} className="flex flex-wrap items-baseline gap-0.5" style={{ paddingLeft: indent }}>
          {key != null && (
            <>
              <span className={keyClass}>&quot;{key}&quot;</span>
              <span className="text-foreground/80">: </span>
            </>
          )}
          <span className={nullClass}>null</span>
        </div>
      )
    }
    if (typeof value === "boolean") {
      return (
        <div key={path} className="flex flex-wrap items-baseline gap-0.5" style={{ paddingLeft: indent }}>
          {key != null && (
            <>
              <span className={keyClass}>&quot;{key}&quot;</span>
              <span className="text-foreground/80">: </span>
            </>
          )}
          <span className={numberClass}>{String(value)}</span>
        </div>
      )
    }
    if (typeof value === "number") {
      return (
        <div key={path} className="flex flex-wrap items-baseline gap-0.5" style={{ paddingLeft: indent }}>
          {key != null && (
            <>
              <span className={keyClass}>&quot;{key}&quot;</span>
              <span className="text-foreground/80">: </span>
            </>
          )}
          <span className={numberClass}>{value}</span>
        </div>
      )
    }
    if (typeof value === "string") {
      return (
        <div key={path} className="flex flex-wrap items-baseline gap-0.5" style={{ paddingLeft: indent }}>
          {key != null && (
            <>
              <span className={keyClass}>&quot;{key}&quot;</span>
              <span className="text-foreground/80">: </span>
            </>
          )}
          <span className={stringClass}>&quot;{value}&quot;</span>
        </div>
      )
    }

    if (Array.isArray(value)) {
      const isExpanded = expanded.has(path)
      const count = value.length
      return (
        <div key={path} className="flex flex-col">
          <button
            type="button"
            onClick={() => toggle(path)}
            className={cn(
              "flex items-center gap-1 min-w-0 text-left rounded py-0.5 -ml-1 hover:bg-muted/50",
              key != null ? "self-start" : ""
            )}
            style={{ paddingLeft: indent }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            {key != null && (
              <>
                <span className={keyClass}>&quot;{key}&quot;</span>
                <span className="text-foreground/80">: </span>
              </>
            )}
            <span className="text-foreground/70">[</span>
            <span className="text-muted-foreground text-xs">{count} items</span>
            <span className="text-foreground/70">]</span>
          </button>
          {isExpanded && (
            <div className="flex flex-col">
              {value.map((item, i) => render(`${path}.${i}`, String(i), item, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    if (typeof value === "object" && value !== null) {
      const isExpanded = expanded.has(path)
      const entries = Object.entries(value)
      const count = entries.length
      return (
        <div key={path} className="flex flex-col">
          <button
            type="button"
            onClick={() => toggle(path)}
            className={cn(
              "flex items-center gap-1 min-w-0 text-left rounded py-0.5 -ml-1 hover:bg-muted/50",
              key != null ? "self-start" : ""
            )}
            style={{ paddingLeft: indent }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            {key != null && (
              <>
                <span className={keyClass}>&quot;{key}&quot;</span>
                <span className="text-foreground/80">: </span>
              </>
            )}
            <span className="text-foreground/70">&#123;</span>
            <span className="text-muted-foreground text-xs">{count} items</span>
            <span className="text-foreground/70">&#125;</span>
          </button>
          {isExpanded && (
            <div className="flex flex-col">
              {entries.map(([k, v]) => render(path ? `${path}.${k}` : k, k, v, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <div
      className={cn("text-sm font-mono overflow-x-hidden overflow-y-auto break-words", className)}
      style={{ paddingLeft: 0 }}
    >
      {render("root", null, obj, 0)}
    </div>
  )
}
