"use client"

import React, { useState, useRef, useEffect } from "react"
import { Pin, PinOff, Copy, Download, Maximize2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface NodeIOPanelProps {
  nodeId: string
  activeTab: "output" | "completion"
  onClose: () => void
  onClear?: () => void
  onPinChange?: (isPinned: boolean) => void
  input?: any
  output?: any
  completion?: any
}

export function NodeIOPanel({ nodeId, activeTab, onClose, onClear, onPinChange, input, output, completion }: NodeIOPanelProps) {
  const [viewMode, setViewMode] = useState<"text" | "formatted" | "code">("formatted")
  const [isMaximized, setIsMaximized] = useState(false)
  const [modalTab, setModalTab] = useState<"input" | "output" | "completion">(activeTab)
  const [isPinned, setIsPinned] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  
  // Reset view mode to "text" when switching to completion tab (since formatted is not available)
  React.useEffect(() => {
    if (activeTab === "completion" && viewMode === "formatted") {
      setViewMode("text")
    }
  }, [activeTab, viewMode])
  
  // Also reset view mode when switching to completion in modal
  React.useEffect(() => {
    if (modalTab === "completion" && viewMode === "formatted") {
      setViewMode("text")
    }
  }, [modalTab, viewMode])
  
  // Update modal tab when activeTab changes
  React.useEffect(() => {
    if (activeTab === "output" || activeTab === "completion") {
      setModalTab(activeTab)
    }
  }, [activeTab])

  // Handle click outside to close panel (only if not pinned)
  useEffect(() => {
    if (isPinned) return // Don't add listener if pinned
    
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
  }, [isPinned, onClose])

  // Check if we have actual output/completion data (flow has been run)
  const currentData = activeTab === "completion" ? completion : output
  const hasOutput = currentData !== null && currentData !== undefined
  const hasAnyData = (output !== null && output !== undefined) || (completion !== null && completion !== undefined)
  
  // Get data for modal based on selected tab
  const modalData = modalTab === "input" ? input : modalTab === "completion" ? completion : output
  const hasModalData = modalData !== null && modalData !== undefined

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
      <div className="bg-card rounded-lg border border-border/50 shadow-md overflow-hidden backdrop-blur-sm w-full">
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
                className={`bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-4 border border-border/50 overflow-x-hidden max-h-72 overflow-y-auto shadow-inner ${
                  activeTab === "completion" && viewMode === "text" && typeof currentData === "string" ? "font-sans" : "font-mono text-xs"
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
                  ) : (
                    <pre className={`whitespace-pre-wrap break-words leading-relaxed text-[11px] ${viewMode === "formatted" ? "px-4" : ""}`}>
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
                    {/* Maximize button - bottom right */}
                    <button
                      className="absolute bottom-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 hover:border-border shadow-sm transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsMaximized(true)
                      }}
                      title="Maximize"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Full screen modal */}
          <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
            <DialogContent 
              className="!max-w-[95vw] !w-[95vw] max-h-[95vh] h-[95vh] flex flex-col p-0"
              onPointerDownOutside={(e) => {
                // Allow closing when clicking outside (on overlay)
                // This is the default behavior, so we don't need to prevent it
              }}
              onClick={(e) => {
                // Stop propagation to prevent closing when clicking inside modal content
                e.stopPropagation()
              }}
              onInteractOutside={(e) => {
                // Allow closing when clicking outside (on overlay)
                // This is the default behavior
              }}
            >
              <DialogHeader className="px-6 py-4 border-b flex-shrink-0 w-full">
                <div className="flex flex-col gap-4 w-full">
                  {/* First row: Title and tabs */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <DialogTitle className="flex-shrink-0 w-[80px]">{modalTab.charAt(0).toUpperCase() + modalTab.slice(1)}</DialogTitle>
                      {/* Tab switcher */}
                      <div className="flex items-center gap-2 flex-shrink-0 w-[280px]">
                      <button
                        type="button"
                        className={`px-3 py-1 text-sm font-normal transition-colors rounded-md whitespace-nowrap ${
                          modalTab === "input" 
                            ? "bg-muted text-foreground" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setModalTab("input")
                        }}
                      >
                        Input
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 text-sm font-normal transition-colors rounded-md whitespace-nowrap ${
                          modalTab === "output" 
                            ? "bg-muted text-foreground" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setModalTab("output")
                        }}
                      >
                        Output
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 text-sm font-normal transition-colors rounded-md whitespace-nowrap ${
                          modalTab === "completion" 
                            ? "bg-muted text-foreground" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setModalTab("completion")
                        }}
                      >
                        Completion
                      </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="h-px bg-border" />
                  
                  {/* Second row: View mode toggle, copy, and download */}
                  <div className="flex items-center gap-4 w-full">
                    {/* View Mode Tabs - fixed width to prevent layout shift */}
                    <div className="w-[140px] flex-shrink-0">
                      <ToggleGroup
                        type="single"
                        value={viewMode}
                        onValueChange={(value) => {
                          if (value) setViewMode(value as "text" | "formatted" | "code")
                        }}
                        className="bg-[#f5f5f5] rounded p-[2px] border-0 h-6 w-full"
                      >
                        <ToggleGroupItem 
                          value="text" 
                          aria-label="Text" 
                          className="px-2.5 h-5 text-[11px] rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                        >
                          Text
                        </ToggleGroupItem>
                        {modalTab !== "completion" ? (
                          <ToggleGroupItem 
                            value="formatted" 
                            aria-label="Formatted" 
                            className="px-3 h-5 text-[11px] rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                          >
                            Formatted
                          </ToggleGroupItem>
                        ) : (
                          <div className="px-3 h-5" /> // Spacer to maintain width
                        )}
                        <ToggleGroupItem 
                          value="code" 
                          aria-label="Code" 
                          className="px-2.5 h-5 text-[11px] rounded-sm border-0 text-muted-foreground data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-sm transition-all"
                        >
                          Code
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-muted text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (hasModalData) {
                            const textToCopy = typeof modalData === "string" ? modalData : formatJSON(modalData)
                            navigator.clipboard.writeText(textToCopy)
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
                              if (hasModalData) {
                                const dataToDownload = modalTab === "input" ? input : modalTab === "completion" ? completion : output
                                downloadFile(formatJSON(dataToDownload), `${modalTab}-${nodeId}.json`, 'application/json')
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download as JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasModalData) {
                                const dataToDownload = modalTab === "input" ? input : modalTab === "completion" ? completion : output
                                downloadFile(convertToCSV(dataToDownload), `${modalTab}-${nodeId}.csv`, 'text/csv')
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download as CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              if (hasModalData) {
                                const dataToDownload = modalTab === "input" ? input : modalTab === "completion" ? completion : output
                                const text = formatJSON(dataToDownload)
                                window.print()
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download as PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-hidden p-6">
                <div 
                  className="h-full w-full bg-gradient-to-br from-muted/60 to-muted/40 rounded-lg p-6 border border-border/50 overflow-x-hidden overflow-y-auto shadow-inner"
                  onWheel={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                  }}
                  style={{ overscrollBehavior: 'contain' }}
                >
                  {hasModalData ? (
                    modalTab === "completion" && viewMode === "text" && typeof modalData === "string" ? (
                      <div className="text-sm leading-relaxed text-foreground/90 space-y-3 px-2">
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{formatMarkdownText(modalData)}</p>
                        </div>
                      </div>
                    ) : (
                      <pre className={`whitespace-pre-wrap break-words leading-relaxed text-sm ${viewMode === "formatted" ? "px-4" : ""}`}>
                        <code className="text-foreground/90">
                          {formatJSON(modalData)}
                        </code>
                      </pre>
                    )
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No {modalTab} yet</p>
                      <p className="text-xs mt-1">Run the flow to see the {modalTab}</p>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

