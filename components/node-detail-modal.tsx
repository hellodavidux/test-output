"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Copy, Download, Trash2, Search, ChevronDown, ChevronUp, Settings, FileText, Building2, Code2 } from "lucide-react"
import { AppIcon } from "./workflow-node"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { Node } from "@xyflow/react"

interface NodeDetailModalProps {
  node: Node | null
  onClose: () => void
  initialTab?: "input" | "output" | "completion"
  initialViewMode?: "text" | "formatted" | "code"
  showRunProgress?: boolean
  runProgressComponent?: React.ReactNode
  onRunProgressClose?: () => void
}

export function NodeDetailModal({ node, onClose, initialTab = "output", initialViewMode = "text", showRunProgress = false, runProgressComponent, onRunProgressClose }: NodeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"input" | "output" | "completion">(initialTab)
  const [viewMode, setViewMode] = useState<"text" | "formatted" | "code">(initialViewMode)
  
  // Update activeTab when initialTab changes (when modal opens with different tab)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Update viewMode when initialViewMode changes (when modal opens with different view mode)
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode)
    }
  }, [initialViewMode])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["tool_invocations", "Tool Invocations"]))
  const [searchQuery, setSearchQuery] = useState("")
  const [mounted, setMounted] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const nodeData = node?.data as any
  const appName = nodeData?.appName || "Unknown"
  const actionName = nodeData?.actionName || "Node"
  const type = nodeData?.type || "action"
  const isAIAgent = appName === "AI Agent" || appName.toLowerCase().includes("ai agent")
  const isInputNode = type === "input"
  
  const input = nodeData?.input
  const output = nodeData?.output
  const completion = nodeData?.completion

  // Reset view mode when switching tabs
  useEffect(() => {
    if (activeTab === "completion" && viewMode === "formatted") {
      setViewMode("text")
    }
  }, [activeTab, viewMode])

  // Handle input node - switch to output tab if trying to view input
  useEffect(() => {
    if (node && (node.data as any)?.type === "input" && activeTab === "input") {
      setActiveTab("output")
    }
  }, [activeTab, node])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [onClose])

  const currentData = activeTab === "input" ? input : activeTab === "completion" ? completion : output
  const hasData = currentData !== null && currentData !== undefined

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
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return <>{parts}</>
  }

  // Render formatted accordion-style view
  const renderFormattedAccordion = (data: any): React.ReactNode => {
    if (data === null || data === undefined) {
      return <div className="text-muted-foreground italic text-sm py-2">No data</div>
    }

    if (typeof data !== "object") {
      return <div className="text-foreground text-sm py-2">{String(data)}</div>
    }

    // Get top-level keys for accordion sections
    const entries = Object.entries(data)
    
    // If no entries, create dummy sections for demonstration
    if (entries.length === 0) {
      const dummySections = [
        { key: "Tool Invocations", value: { query: "What is the capital of France?", search_results: "Inserted retrieved snippets", url_1: "linkedin.com", url_2: "theorg.com", user_question: "Etc" } },
        { key: "Citations", value: { citation_1: "Source document 1", citation_2: "Source document 2" } },
        { key: "Prompt", value: { system: "You are a helpful assistant", user: "Answer the following question" } },
        { key: "Provider", value: { name: "OpenAI", model: "GPT-4", version: "1.0" } },
        { key: "Params", value: { temperature: 0.7, max_tokens: 1000, top_p: 1.0 } }
      ]
      return (
        <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
          {dummySections.map(({ key, value }) => {
            const sectionPath = key
            const isExpanded = expandedItems.has(sectionPath)
            return (
              <div key={key} className="border-b border-gray-200 last:border-b-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedItems(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has(sectionPath)) {
                        newSet.delete(sectionPath)
                      } else {
                        newSet.add(sectionPath)
                      }
                      return newSet
                    })
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                    isExpanded ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getSectionIcon(key)}
                    <span className="text-sm font-medium text-foreground">{key}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="bg-white px-4 py-3">
                    {renderFormattedTree(value, 0, sectionPath)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    // Icon mapping for common section names
    const getSectionIcon = (key: string) => {
      const lowerKey = key.toLowerCase()
      if (lowerKey.includes("tool") || lowerKey.includes("invocation")) {
        return <Settings className="w-4 h-4 text-gray-600" />
      }
      if (lowerKey.includes("citation")) {
        return <FileText className="w-4 h-4 text-gray-400" />
      }
      if (lowerKey.includes("prompt")) {
        return <FileText className="w-4 h-4 text-gray-400" />
      }
      if (lowerKey.includes("provider")) {
        return <Building2 className="w-4 h-4 text-gray-400" />
      }
      if (lowerKey.includes("param")) {
        return <Code2 className="w-4 h-4 text-gray-400" />
      }
      return <FileText className="w-4 h-4 text-gray-400" />
    }

    // Helper to ensure sections have content - add dummy data if empty
    const ensureSectionContent = (key: string, value: any): any => {
      if (value === null || value === undefined || (typeof value === "object" && Object.keys(value).length === 0)) {
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes("tool") || lowerKey.includes("invocation")) {
          return {
            query: "What is the capital of France?",
            search_results: "Inserted retrieved snippets",
            url_1: "linkedin.com",
            url_2: "theorg.com",
            user_question: "Etc"
          }
        }
        if (lowerKey.includes("citation")) {
          return {
            citation_1: "Source document 1",
            citation_2: "Source document 2",
            citation_3: "Source document 3"
          }
        }
        if (lowerKey.includes("prompt")) {
          return {
            system: "You are a helpful assistant",
            user: "Answer the following question",
            context: "Additional context information"
          }
        }
        if (lowerKey.includes("provider")) {
          return {
            name: "OpenAI",
            model: "GPT-4",
            version: "1.0"
          }
        }
        if (lowerKey.includes("param")) {
          return {
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1.0
          }
        }
        return { value: "Sample content", data: "Additional information" }
      }
      return value
    }

    return (
      <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
        {entries.map(([key, value], index) => {
          const sectionPath = key
          const isExpanded = expandedItems.has(sectionPath)
          const hasNestedData = typeof value === "object" && value !== null && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)

          return (
            <div key={key} className="border-b border-gray-200 last:border-b-0">
              {/* Accordion Header */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedItems(prev => {
                    const newSet = new Set(prev)
                    if (newSet.has(sectionPath)) {
                      newSet.delete(sectionPath)
                    } else {
                      newSet.add(sectionPath)
                    }
                    return newSet
                  })
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isExpanded ? "bg-gray-50" : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {getSectionIcon(key)}
                  <span className="text-sm font-medium text-foreground">{key}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* Accordion Content - Tree Structure */}
              {isExpanded && (
                <div className="bg-white px-4 py-3">
                  {hasNestedData ? (
                    renderFormattedTree(ensureSectionContent(key, value), 0, sectionPath)
                  ) : (
                    <div className="text-sm text-foreground">
                      {ensureSectionContent(key, value) && typeof ensureSectionContent(key, value) === "object" 
                        ? renderFormattedTree(ensureSectionContent(key, value), 0, sectionPath)
                        : String(ensureSectionContent(key, value) || "No content available")
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Render tree structure for expanded accordion sections
  const renderFormattedTree = (data: any, level: number = 0, parentPath: string = ""): React.ReactNode => {
    if (data === null || data === undefined) {
      return <span className="text-muted-foreground italic text-sm">null</span>
    }

    if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
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

            // Check if value is a URL (starts with http)
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
                      <span className="text-sm font-medium text-foreground">Item {index + 1}</span>
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
    
    const entries = Object.entries(data)
    return ['Key,Value', ...entries.map(([key, value]) => {
      const val = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
      return `${key},${val}`
    })].join('\n')
  }

  if (!node || !mounted) return null

  // Get identifier and duration from node data (passed from run progress)
  const identifier = (nodeData as any)?._identifier || node.id
  const duration = (nodeData as any)?._duration
  
  // Extract node number for display (e.g., "1" from "node-1" or "llm-1")
  const nodeNumber = identifier.split("-").pop() || "1"

  // Modal content to be rendered via portal
  const modalContent = (
    <>
      {/* Backdrop - only closes when clicking directly on backdrop */}
      <div 
        data-node-detail-modal="backdrop"
        className="fixed inset-0 bg-black/20 z-[100]" 
        onClick={(e) => {
          // Only close if clicking directly on the backdrop element itself
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
        onMouseDown={(e) => {
          // Prevent any mousedown events from bubbling
          if (e.target === e.currentTarget) {
            e.stopPropagation()
          }
        }}
      />
      
      {/* Modal - stop all click propagation to prevent backdrop from closing */}
      <div
        data-node-detail-modal="content"
        ref={modalRef}
        className="fixed right-0 top-0 bottom-0 z-[101] flex flex-row items-end"
        style={{
          marginTop: "24px",
          marginBottom: "24px",
          marginRight: "24px",
          height: "calc(100vh - 48px)",
          width: showRunProgress ? "calc(100% - 48px)" : "60%",
        }}
        onClick={(e) => {
          // Stop propagation to prevent backdrop click
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          // Also stop on mousedown to prevent any event bubbling
          e.stopPropagation()
        }}
      >
        {/* Main Modal Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white shadow-2xl rounded-lg h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Icon */}
            {appName === "AI Agent" && actionName === "LLM" ? (
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 border border-border rounded">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
            ) : (
              <div className={`w-8 h-8 rounded-lg border border-border flex items-center justify-center ${
                type === "input" ? "bg-white" : "bg-muted"
              }`}>
                <AppIcon appName={appName} className="w-4 h-4" />
              </div>
            )}
            <h2 className="text-xl font-semibold">{actionName} {nodeNumber}</h2>
            <span className="px-2 py-0.5 text-xs font-normal text-gray-400 border border-gray-300 rounded-md">
              {identifier}
            </span>
            {duration && (
              <span className="text-sm text-gray-500">{duration}s</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 px-6 border-b flex-shrink-0 mt-4">
          {!isInputNode && (
            <button
              onClick={() => setActiveTab("input")}
              className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 border-b-2 ${
                activeTab === "input"
                  ? "text-foreground border-gray-400"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              Input
            </button>
          )}
          {isAIAgent && (
            <button
              onClick={() => setActiveTab("completion")}
              className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 border-b-2 ${
                activeTab === "completion"
                  ? "text-foreground border-gray-400"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              Completion
            </button>
          )}
          <button
            onClick={() => setActiveTab("output")}
            className={`relative text-sm font-normal transition-colors cursor-pointer leading-none pb-3 border-b-2 ${
              activeTab === "output"
                ? "text-foreground border-gray-400"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
          >
            Output
          </button>
        </div>

        {/* Search Bar, View Mode and Actions Row */}
        <div className="flex items-center justify-between gap-4 px-6 pb-2 bg-background flex-shrink-0 pt-6">
          {/* Search Bar on the left */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* View Mode Tabs and Action Icons on the right */}
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => {
                if (value) setViewMode(value as "text" | "formatted" | "code")
              }}
              className="bg-[#f5f5f5] rounded p-1 border-0 h-8"
            >
              <ToggleGroupItem 
                value="text" 
                aria-label="Text" 
                className="px-4 h-7 text-sm rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
              >
                Text
              </ToggleGroupItem>
              {activeTab !== "completion" && (
                <ToggleGroupItem 
                  value="formatted" 
                  aria-label="Formatted" 
                  className="px-4 h-7 text-sm rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                >
                  Formatted
                </ToggleGroupItem>
              )}
              <ToggleGroupItem 
                value="code" 
                aria-label="Code" 
                className="px-4 h-7 text-sm rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
              >
                Code
              </ToggleGroupItem>
            </ToggleGroup>

            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-muted text-muted-foreground"
                onClick={() => {
                  if (hasData) {
                    navigator.clipboard.writeText(formatJSON(currentData))
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
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      if (hasData) {
                        downloadFile(formatJSON(currentData), `${activeTab}-${node.id}.json`, 'application/json')
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (hasData) {
                        downloadFile(convertToCSV(currentData), `${activeTab}-${node.id}.csv`, 'text/csv')
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-background px-6 py-4">
          <div className="relative">
            <div 
              className={`${
                viewMode === "formatted" 
                  ? "" 
                  : activeTab === "completion" && viewMode === "text" && typeof currentData === "string" 
                    ? "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden shadow-inner font-sans" 
                    : "bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden shadow-inner font-mono text-xs"
              }`}
            >
              {hasData ? (
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
                  <div className="text-sm text-foreground/90">
                    {renderFormattedAccordion(currentData)}
                  </div>
                ) : (
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
            </div>
          </div>
        </div>
        </div>
        
        {/* Transparent gap between panels - clickable to close modal */}
        {showRunProgress && runProgressComponent && (
          <div 
            className="w-4 flex-shrink-0 cursor-pointer" 
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
          />
        )}
        
        {/* Run Progress Panel - shown when opened from run progress, on the right */}
        {showRunProgress && runProgressComponent && (
          <div className="flex-shrink-0 bg-white shadow-2xl rounded-lg h-fit">
            {runProgressComponent}
          </div>
        )}
      </div>
    </>
  )

  // Render modal using portal at document root level for complete independence
  return createPortal(modalContent, document.body)
}

