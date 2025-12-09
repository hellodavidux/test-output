"use client"

import React from "react"
import {
  Search,
  Link as LinkIcon,
  Bell,
  HelpCircle,
  TrendingUp,
  User,
  Upload,
  Save,
  Play,
} from "lucide-react"

// Custom icon components for sidebar
const HouseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
  </svg>
)

const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
    <path d="M3 12A9 3 0 0 0 21 12"></path>
  </svg>
)

const ArrowLeftRightIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M8 3 4 7l4 4"></path>
    <path d="M4 7h16"></path>
    <path d="m16 21 4-4-4-4"></path>
    <path d="M20 17H4"></path>
  </svg>
)

const SquarePenIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
  </svg>
)

const ChartColumnIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M5 21v-6"></path>
    <path d="M12 21V9"></path>
    <path d="M19 21V3"></path>
  </svg>
)

const GitBranchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <line x1="6" x2="6" y1="3" y2="15"></line>
    <circle cx="18" cy="6" r="3"></circle>
    <circle cx="6" cy="18" r="3"></circle>
    <path d="M18 9a9 9 0 0 1-9 9"></path>
  </svg>
)
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { SelectedAction } from "@/lib/types"

interface DashboardLayoutProps {
  children: React.ReactNode
  onActionSelect?: (action: SelectedAction) => void
  onRun?: () => void
}

export function DashboardLayout({ children, onActionSelect, onRun }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = React.useState("Workflow")

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
        {/* Left: Logo and Project Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-foreground font-bold text-sm border border-border">
            A
          </div>
          <span className="text-sm font-medium text-foreground">Antlio Testing / Sidebar</span>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="flex items-center gap-1">
          {["Workflow", "Export", "Analytics", "Manager"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors rounded-md",
                activeTab === tab
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right: User Profile and Actions */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="h-8 w-8">
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRun}>
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
          <Button variant="default" size="sm" className="h-8 bg-foreground text-background hover:bg-foreground/90">
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <TooltipProvider delayDuration={100}>
          <div className="hidden flex w-12 flex-col items-center border-r border-border bg-background py-5">
            <div className="flex flex-col items-center gap-1.5">

              {/* Icons */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <HouseIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Projects</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <DatabaseIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Knowledge Base</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <ArrowLeftRightIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Connections</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <SquarePenIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Prompt Library</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <ChartColumnIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Project Analytics</span>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Bottom Section: Links, Notifications, Help, Trends, and User Profile */}
            <div className="mt-auto mb-2 flex flex-col items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <LinkIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Links</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <Bell className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Notifications</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Help</span>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <TrendingUp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} hideArrow>
                  <span>Trends</span>
                </TooltipContent>
              </Tooltip>

              {/* User Profile */}
              <div className="mt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} hideArrow>
                    <span>Profile</span>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </div>
    </div>
  )
}

