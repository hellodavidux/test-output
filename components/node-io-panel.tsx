"use client"

import React, { useState, useRef, useEffect } from "react"
import { Pin, PinOff, Copy, Download, Trash2, X, ChevronDown, ChevronUp, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useReactFlow } from "@xyflow/react"
import { NodeDetailModal } from "./node-detail-modal"
import type { Node } from "@xyflow/react"

function getNodeIconBg(appName: string): string {
  const name = appName.toLowerCase()

  const colorMap: Record<string, string> = {
    // Apps - amber
    slack: "border-amber-200 bg-amber-50",
    stackai: "border-amber-200 bg-amber-50",
    airtable: "border-amber-200 bg-amber-50",
    anthropic: "border-amber-200 bg-amber-50",
    // Inputs - blue
    input: "border-blue-200 bg-blue-50",
    files: "border-blue-200 bg-blue-50",
    trigger: "border-blue-200 bg-blue-50",
    url: "border-blue-200 bg-blue-50",
    audio: "border-blue-200 bg-blue-50",
    // Outputs - green
    output: "border-green-200 bg-green-50",
    action: "border-green-200 bg-green-50",
    template: "border-green-200 bg-green-50",
    // Core - purple
    "ai agent": "border-purple-200 bg-purple-50",
    "knowledge base": "border-purple-200 bg-purple-50",
    // Logic - orange
    condition: "border-orange-200 bg-orange-50",
    loop: "border-orange-200 bg-orange-50",
    switch: "border-orange-200 bg-orange-50",
    // Utils - gray
    delay: "border-gray-200 bg-gray-50",
    "http request": "border-gray-200 bg-gray-50",
    code: "border-gray-200 bg-gray-50",
    // Send Email
    "send email": "border-green-200 bg-green-50",
  }

  return colorMap[name] ?? "border-amber-200 bg-amber-50"
}

interface NodeIOPanelProps {
  nodeId: string
  activeTab: "output" | "completion"
  onClose: () => void
  onClear?: () => void
  onPinChange?: (isPinned: boolean) => void
  input?: any
  output?: any
  completion?: any
  appName?: string
  actionName?: string
}

export function NodeIOPanel({ nodeId, activeTab, onClose, onClear, onPinChange, input, output, completion, appName, actionName }: NodeIOPanelProps) {
  const [viewMode, setViewMode] = useState<"text" | "formatted" | "code">("formatted")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["tool-invocations"]))
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isPinned, setIsPinned] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { getNode, getNodes, getEdges } = useReactFlow()
  
  // Reset view mode to "text" when switching to completion tab (since formatted is not available)
  React.useEffect(() => {
    if (activeTab === "completion" && viewMode === "formatted") {
      setViewMode("text")
    }
  }, [activeTab, viewMode])

  // Handle click outside to close panel (only if not pinned)
  useEffect(() => {
    if (isPinned || isModalOpen) return // Don't add listener if pinned or modal is open
    
    let mouseDownPosition: { x: number; y: number } | null = null
    const DRAG_THRESHOLD = 5 // pixels - if mouse moves more than this, it's a drag
    
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Don't track if clicking on the node footer (Output/Completion buttons)
      if (target.closest('[data-node-footer]')) {
        return
      }
      
      // Don't track if clicking inside the panel
      if (panelRef.current && panelRef.current.contains(target)) {
        return
      }
      
      // Don't track if clicking on the modal
      if (target.closest('[data-node-detail-modal]')) {
        return
      }
      
      // Store mouse position to detect drag vs click
      mouseDownPosition = { x: event.clientX, y: event.clientY }
    }
    
    const handleMouseUp = (event: MouseEvent) => {
      if (!mouseDownPosition) return
      
      const target = event.target as HTMLElement
      
      // Don't close if clicking on the node footer
      if (target.closest('[data-node-footer]')) {
        mouseDownPosition = null
        return
      }
      
      // Don't close if clicking inside the panel
      if (panelRef.current && panelRef.current.contains(target)) {
        mouseDownPosition = null
        return
      }
      
      // Don't close if clicking on the modal
      if (target.closest('[data-node-detail-modal]')) {
        mouseDownPosition = null
        return
      }
      
      // Calculate distance moved
      const distance = Math.sqrt(
        Math.pow(event.clientX - mouseDownPosition.x, 2) + 
        Math.pow(event.clientY - mouseDownPosition.y, 2)
      )
      
      // Only close if it was a click (not a drag)
      if (distance < DRAG_THRESHOLD) {
        onClose()
      }
      
      mouseDownPosition = null
    }

    // Add listeners with a small delay to avoid immediate triggering
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown, true)
      document.addEventListener('mouseup', handleMouseUp, true)
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleMouseDown, true)
      document.removeEventListener('mouseup', handleMouseUp, true)
    }
  }, [isPinned, isModalOpen, onClose])

  // Check if we have actual output/completion data (flow has been run)
  const currentData = activeTab === "completion" ? completion : output
  const hasOutput = currentData !== null && currentData !== undefined
  const hasAnyData = (output !== null && output !== undefined) || (completion !== null && completion !== undefined)

  // Helper function to download file
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Convert output to CSV format
  const convertToCSV = (data: any): string => {
    if (typeof data !== 'object' || data === null) {
      return String(data)
    }
    
    if (Array.isArray(data)) {
      if (data.length === 0) return ''
      const headers = Object.keys(data[0] || {})
      const rows = data.map(item => 
        headers.map(header => {
          const value = item[header]
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value)
          }
          return String(value ?? '')
        })
      )
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    }
    
    // For objects, create key-value pairs
    const entries = Object.entries(data)
    return ['Key,Value', ...entries.map(([key, value]) => {
      const val = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
      return `${key},${val}`
    })].join('\n')
  }

  // Format JSON with proper indentation
  const formatJSON = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  // Convert data to plain text format (for text view) - single paragraph, no structure
  const formatAsPlainText = (data: any): string => {
    if (data === null || data === undefined) {
      return ""
    }
    if (typeof data === "string") {
      return data
    }
    if (typeof data === "number" || typeof data === "boolean") {
      return String(data)
    }
    if (Array.isArray(data)) {
      return data.map(item => formatAsPlainText(item)).join(" ")
    }
    if (typeof data === "object") {
      // Flatten object to plain text - recursively extract all values
      const extractValues = (obj: any): string[] => {
        const values: string[] = []
        for (const [key, value] of Object.entries(obj)) {
          if (value === null || value === undefined) {
            continue
          } else if (typeof value === "object" && !Array.isArray(value)) {
            values.push(...extractValues(value))
          } else if (Array.isArray(value)) {
            value.forEach(item => {
              if (typeof item === "object" && item !== null) {
                values.push(...extractValues(item))
              } else {
                values.push(String(item))
              }
            })
          } else {
            values.push(String(value))
          }
        }
        return values
      }
      return extractValues(data).join(" ")
    }
    return String(data)
  }

  // Render formatted tree structure (like the image with pill labels)
  const renderFormattedTree = (data: any, level: number = 0, parentPath: string = ""): React.ReactNode => {
    if (data === null || data === undefined) {
      return <span className="text-muted-foreground italic text-sm">null</span>
    }

    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
      // Check if string is a URL
      const isUrl = typeof data === "string" && (data.startsWith("http://") || data.startsWith("https://"))
      if (isUrl) {
        return (
          <a
            href={data as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            {data as string}
          </a>
        )
      }
      return <span className="text-sm text-foreground">{String(data)}</span>
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <span className="text-muted-foreground italic text-sm">Empty array</span>
      }
      return (
        <div className="space-y-2">
          {data.map((item, index) => {
            const itemPath = `${parentPath}[${index}]`
            const isExpanded = expandedItems.has(itemPath)
            const hasNestedData = typeof item === "object" && item !== null && (Array.isArray(item) ? item.length > 0 : Object.keys(item).length > 0)

            return (
              <div key={index} className="pl-4">
                {hasNestedData ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItems(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(itemPath)) {
                            newSet.delete(itemPath)
                          } else {
                            newSet.add(itemPath)
                          }
                          return newSet
                        })
                      }}
                      className="flex items-center gap-2 hover:text-foreground transition-colors text-left w-full mb-1"
                    >
                      <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                        {Array.isArray(item) ? `Item ${index + 1}` : `URL ${index + 1}`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="pl-4 mt-1">
                        {renderFormattedTree(item, level + 1, itemPath)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                      {Array.isArray(item) ? `Item ${index + 1}` : `URL ${index + 1}`}
                    </span>
                    <span className="text-sm text-foreground">{renderFormattedTree(item, level + 1, itemPath)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (typeof data === "object") {
      const entries = Object.entries(data)
      if (entries.length === 0) {
        return <span className="text-muted-foreground italic text-sm">Empty object</span>
      }

      return (
        <div className="space-y-2">
          {entries.map(([key, value]) => {
            const itemPath = parentPath ? `${parentPath}.${key}` : key
            const isExpanded = expandedItems.has(itemPath)
            const hasNestedData = typeof value === "object" && value !== null && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)
            const isPrimitive = typeof value !== "object" || value === null

            // Check if value is a URL
            const isUrl = typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://"))

            return (
              <div key={key} className={level > 0 ? "pl-4" : ""}>
                {hasNestedData ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItems(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(itemPath)) {
                            newSet.delete(itemPath)
                          } else {
                            newSet.add(itemPath)
                          }
                          return newSet
                        })
                      }}
                      className="flex items-center gap-2 hover:text-foreground transition-colors text-left w-full mb-1"
                    >
                      <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                        {key}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="pl-4 mt-1">
                        {renderFormattedTree(value, level + 1, itemPath)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                      {key}
                    </span>
                    {isUrl ? (
                      <a
                        href={value as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {value as string}
                      </a>
                    ) : (
                      <span className="text-sm text-foreground">{String(value)}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    return <span className="text-muted-foreground text-sm">{String(data)}</span>
  }

  // Render hierarchical data structure (for non-formatted views)
  const renderHierarchicalData = (data: any, path: string = "", level: number = 0): React.ReactNode => {
    if (data === null || data === undefined) {
      return <span className="text-muted-foreground italic">null</span>
    }

    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
      return <span className="text-foreground/90">{String(data)}</span>
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <span className="text-muted-foreground italic text-sm">Empty array</span>
      }
      return (
        <div className="space-y-2">
          {data.map((item, index) => {
            const itemPath = `${path}[${index}]`
            const isExpanded = expandedItems.has(itemPath)
            const hasNestedData = typeof item === "object" && item !== null && (Array.isArray(item) ? item.length > 0 : Object.keys(item).length > 0)
            
            return (
              <div key={index} className="pl-6">
                {hasNestedData ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItems(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(itemPath)) {
                            newSet.delete(itemPath)
                          } else {
                            newSet.add(itemPath)
                          }
                          return newSet
                        })
                      }}
                      className="flex items-center gap-2 hover:text-foreground transition-colors text-left w-full"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-foreground">URL {index + 1}</span>
                    </button>
                    {isExpanded && (
                      <div className="pl-6 mt-1.5">
                        {renderHierarchicalData(item, itemPath, level + 1)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-foreground/90 pl-6">
                    {renderHierarchicalData(item, itemPath, level + 1)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    if (typeof data === "object") {
      const entries = Object.entries(data)
      if (entries.length === 0) {
        return <span className="text-muted-foreground italic text-sm">Empty object</span>
      }

      return (
        <div className="space-y-2.5">
          {entries.map(([key, value]) => {
            const itemPath = path ? `${path}.${key}` : key
            const isExpanded = expandedItems.has(itemPath)
            const hasNestedData = typeof value === "object" && value !== null && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)
            const isPrimitive = typeof value !== "object" || value === null

            // Special handling for top-level tool names (like "Web search")
            const isTopLevelTool = level === 0 && typeof value === "object" && value !== null

            return (
              <div key={key} className={level === 0 ? "" : "pl-6"}>
                {hasNestedData ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedItems(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(itemPath)) {
                            newSet.delete(itemPath)
                          } else {
                            newSet.add(itemPath)
                          }
                          return newSet
                        })
                      }}
                      className={`flex items-center gap-2 hover:text-foreground transition-colors text-left w-full ${isTopLevelTool ? "mb-2" : ""}`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm ${isTopLevelTool ? "font-semibold" : "font-medium"} text-foreground`}>{key}</span>
                    </button>
                    {isExpanded && (
                      <div className="pl-6 mt-1.5">
                        {renderHierarchicalData(value, itemPath, level + 1)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-foreground flex-shrink-0">{key}:</span>
                    <span className="text-sm text-foreground/90 break-words">{renderHierarchicalData(value, itemPath, level + 1)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    return <span className="text-muted-foreground text-sm">{String(data)}</span>
  }

  // Format markdown text with links and citations
  const formatMarkdownText = (text: string): React.ReactNode => {
    if (!text || typeof text !== "string") return text
    
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    
    // Match markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const matches = Array.from(text.matchAll(linkRegex))
    
    // Match citations: [^number]
    const citationRegex = /\[\^([^\]]+)\]/g
    const citationMatches = Array.from(text.matchAll(citationRegex))
    
    // Combine all matches and sort by position
    const allMatches = [
      ...matches.map(m => ({ type: 'link', match: m, index: m.index! })),
      ...citationMatches.map(m => ({ type: 'citation', match: m, index: m.index! }))
    ].sort((a, b) => a.index - b.index)
    
    allMatches.forEach(({ type, match, index }) => {
      // Add text before match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index))
      }
      
      if (type === 'link') {
        const linkText = match[1]
        const linkUrl = match[2]
        parts.push(
          <a
            key={`link-${index}`}
            href={linkUrl}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            onClick={(e) => {
              e.stopPropagation()
              if (linkUrl.startsWith('mailto:')) {
                window.location.href = linkUrl
              } else {
                window.open(linkUrl, '_blank', 'noopener,noreferrer')
              }
            }}
          >
            {linkText}
          </a>
        )
        lastIndex = index + match[0].length
      } else if (type === 'citation') {
        const citationId = match[1]
        // Extract just the number from the citation ID (e.g., "1" from "1" or "citation-1")
        const citationNumber = citationId.match(/\d+/)?.[0] || citationId
        parts.push(
          <sup
            key={`citation-${index}`}
            className="text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline"
            title={`Citation ${citationId}`}
          >
            [{citationNumber}]
          </sup>
        )
        lastIndex = index + match[0].length
      }
    })
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return <>{parts}</>
  }

  const formatValue = (value: any, depth = 0): React.ReactNode => {
    if (value === null) return <span className="text-orange-500 dark:text-orange-400 font-medium">null</span>
    if (value === undefined) return <span className="text-orange-500 dark:text-orange-400 font-medium">undefined</span>
    
    if (typeof value === "string") {
      return <span className="text-emerald-600 dark:text-emerald-400">"{value}"</span>
    }
    
    if (typeof value === "number") {
      return <span className="text-blue-600 dark:text-blue-400 font-medium">{value}</span>
    }
    
    if (typeof value === "boolean") {
      return <span className="text-purple-600 dark:text-purple-400 font-medium">{String(value)}</span>
    }
    
    if (Array.isArray(value)) {
      if (depth > 2) return <span className="text-muted-foreground italic">[...]</span>
      return (
        <div className="ml-3">
          <span className="text-muted-foreground">[</span>
          <div className="ml-2 space-y-0.5 mt-0.5">
            {value.map((item, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-muted-foreground/70 text-[10px]">{idx}</span>
                <span className="text-muted-foreground">:</span>
                <div className="flex-1">{formatValue(item, depth + 1)}</div>
                {idx < value.length - 1 && <span className="text-muted-foreground">,</span>}
              </div>
            ))}
          </div>
          <span className="text-muted-foreground">]</span>
        </div>
      )
    }
    
    if (typeof value === "object") {
      if (depth > 2) return <span className="text-muted-foreground italic">{"{...}"}</span>
      const entries = Object.entries(value)
      if (entries.length === 0) return <span className="text-muted-foreground">{"{}"}</span>
      
      return (
        <div className="ml-3">
          <span className="text-muted-foreground">{"{"}</span>
          <div className="ml-2 space-y-0.5 mt-0.5">
            {entries.map(([key, val], idx) => (
              <div key={key} className="flex items-start gap-1.5">
                <span className="text-blue-600 dark:text-blue-400 font-medium">"{key}"</span>
                <span className="text-muted-foreground">:</span>
                <div className="flex-1">{formatValue(val, depth + 1)}</div>
                {idx < entries.length - 1 && <span className="text-muted-foreground">,</span>}
              </div>
            ))}
          </div>
          <span className="text-muted-foreground">{"}"}</span>
        </div>
      )
    }
    
    return <span className="text-muted-foreground">{String(value)}</span>
  }

  return (
    <div ref={panelRef} data-io-panel className="mt-2 w-[380px] animate-in fade-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
      <div className={`bg-card rounded-lg border border-border/50 overflow-hidden backdrop-blur-sm w-full ${isPinned ? 'shadow-none' : 'shadow-md'}`}>
        <div>
          {/* View Mode and Actions Row */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-background">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value) setViewMode(value as "text" | "formatted" | "code")
              }}
              className="bg-[#f5f5f5] rounded p-[2px] border-0 h-6"
            >
              <ToggleGroupItem 
                value="text" 
                aria-label="Text" 
                className="px-2.5 h-5 text-[11px] rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
              >
                Text
              </ToggleGroupItem>
              {activeTab !== "completion" && (
                <ToggleGroupItem 
                  value="formatted" 
                  aria-label="Formatted" 
                  className="px-5 h-5 text-[11px] rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                >
                  Formatted
                </ToggleGroupItem>
              )}
              <ToggleGroupItem 
                value="code" 
                aria-label="Code" 
                className="px-2.5 h-5 text-[11px] rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
              >
                Code
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  // Copy functionality
                  if (hasOutput) {
                    navigator.clipboard.writeText(formatJSON(output))
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasOutput) {
                                downloadFile(formatJSON(output), `output-${nodeId}.json`, 'application/json')
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download as JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasOutput) {
                                downloadFile(convertToCSV(output), `output-${nodeId}.csv`, 'text/csv')
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download as CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasOutput) {
                                // For PDF, we'll create a simple text-based PDF
                                // In a real implementation, you might want to use a library like jsPDF
                                const text = formatJSON(output)
                                // Simple approach: create a text file that can be converted to PDF
                                // Or use window.print() to print the content
                                window.print()
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download as PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
              </DropdownMenu>
              {/* Divider */}
              <div className="h-5 w-px bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 hover:bg-muted text-muted-foreground ${isPinned ? 'bg-muted' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  const newPinnedState = !isPinned
                  setIsPinned(newPinnedState)
                  onPinChange?.(newPinnedState)
                }}
                title={isPinned ? "Unpin panel" : "Pin panel"}
              >
                {isPinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-background px-4 pb-4">
            <div className="relative">
              <div 
                className={`${
                  viewMode === "formatted" 
                    ? "overflow-x-hidden max-h-72 overflow-y-auto" 
                    : viewMode === "text"
                      ? "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden max-h-72 overflow-y-auto shadow-inner font-sans"
                      : activeTab === "completion" && viewMode === "text" && typeof currentData === "string"
                        ? "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden max-h-72 overflow-y-auto shadow-inner font-sans"
                        : "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden max-h-72 overflow-y-auto shadow-inner font-mono text-xs"
                }`}
                onWheel={(e) => {
                  e.stopPropagation()
                }}
              >
                {hasOutput ? (
                  activeTab === "completion" && viewMode === "text" && typeof currentData === "string" ? (
                    <div className="text-sm leading-relaxed text-foreground/90 space-y-3 px-2">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{formatMarkdownText(currentData)}</p>
                      </div>
                    </div>
                  ) : viewMode === "text" ? (
                    // Text view - plain text, no JSON structure, single paragraph
                    <p className="text-sm text-foreground break-words">
                      {formatAsPlainText(currentData)}
                    </p>
                  ) : viewMode === "formatted" ? (
                    // Formatted view - tree structure with pill labels
                    <div className="text-sm text-foreground/90">
                      {renderFormattedTree(currentData)}
                    </div>
                  ) : (
                    // Code view - formatted JSON code
                    <pre className="whitespace-pre-wrap break-words leading-relaxed text-[11px]">
                      <code className="text-foreground/90">
                        {formatJSON(currentData)}
                      </code>
                    </pre>
                  )
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No {activeTab} yet</p>
                    <p className="text-xs mt-1">Run the flow to see the {activeTab}</p>
                  </div>
                )}
                {/* Action buttons */}
                {hasOutput && (
                  <>
                    {/* Clear button - bottom left - shows if any data exists and clears both output and completion */}
                    {onClear && hasAnyData && (
                      <button
                        className="absolute bottom-2 left-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm transition-colors z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClear() // This clears both output and completion for the node
                        }}
                        title="Clear output and completion"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {/* Expand button - bottom right */}
                    <button
                      className="absolute bottom-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsModalOpen(true)
                      }}
                      title="Expand in modal"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Node Detail Modal */}
      {isModalOpen && (() => {
        const node = getNode(nodeId)
        if (node) {
          // Create node with all the data for the modal
          const modalNode: Node = {
            ...node,
            data: {
              ...node.data,
              input,
              output,
              completion,
              appName: appName || (node.data as any)?.appName || "Unknown",
              actionName: actionName || (node.data as any)?.actionName || "Node",
            }
          }
          return (
            <NodeDetailModal
              node={modalNode}
              onClose={() => setIsModalOpen(false)}
              initialTab={activeTab === "completion" ? "completion" : "output"}
              initialViewMode={viewMode}
              nodes={getNodes()}
              edges={getEdges()}
            />
          )
        }
        return null
      })()}
    </div>
  )
}

