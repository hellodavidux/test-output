"use client"

import React from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Activity,
  BarChart,
  Bell,
  BotIcon,
  DatabaseIcon,
  GitBranchIcon,
  GlobeIcon,
  HelpCircle,
  Home,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  PenBoxIcon,
  Search,
  UnplugIcon,
} from "lucide-react"
import Image from "next/image"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sidebar,
  SidebarButton,
  SidebarButtonGroup,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface OuterLayoutProps {
  children: React.ReactNode
  /** The nav key to mark as active (e.g. "org-evaluator", "analytics") */
  activeNavKey?: string
}

export function OuterLayout({ children, activeNavKey }: OuterLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarHovered, setSidebarHovered] = React.useState(false)
  const [isSidebarPinned, setIsSidebarPinned] = React.useState(false)

  const isSidebarExpanded = sidebarHovered || isSidebarPinned

  const navItems = [
    { key: "search", label: "Search", Icon: Search, href: null },
    { key: "projects", label: "Projects", Icon: Home, href: "/" },
    { key: "data", label: "Data", Icon: DatabaseIcon, href: null },
    { key: "connections", label: "Connections", Icon: UnplugIcon, href: null },
    { key: "prompts", label: "Prompts", Icon: PenBoxIcon, href: null },
    { key: "environments", label: "Environments", Icon: GlobeIcon, href: null },
    { key: "pull-requests", label: "Pull Requests", Icon: GitBranchIcon, href: null },
    { key: "analytics", label: "Analytics", Icon: BarChart, href: "/analytics" },
    { key: "org-evaluator", label: "Evaluator", Icon: ListChecks, href: "/org-evaluator" },
    { key: "ai-agents", label: "AI Agents", Icon: BotIcon, href: null },
  ]

  const footerItems = [
    { key: "notifications", label: "Notifications", Icon: Bell, dot: "bg-blue-500" },
    { key: "help", label: "Help & More", Icon: HelpCircle },
    { key: "status", label: "System Status", Icon: Activity, dot: "bg-emerald-500" },
  ]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Outer sidebar */}
      <div
        className={cn(
          "relative h-full transition-[min-width,max-width] duration-200 shrink-0",
          isSidebarPinned ? "min-w-[220px] max-w-[220px]" : "min-w-12 max-w-12",
        )}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <Sidebar
          collapsible
          collapsed={!isSidebarExpanded}
          width={220}
          className={cn(
            "absolute inset-y-0 z-50 flex min-h-0 flex-col overflow-hidden border-r bg-background transition-all",
            isSidebarExpanded && !isSidebarPinned && "shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]",
          )}
        >
          <div className="flex h-full min-h-0 flex-col px-2 transition-all">
            {/* Header: StackAI logo + pin toggle */}
            <SidebarHeader
              className={cn("mt-2 flex flex-col", isSidebarExpanded ? "items-start" : "items-center")}
            >
              <div
                className={cn(
                  "flex min-h-8 w-full shrink-0 items-center",
                  isSidebarExpanded ? "justify-between pl-1.5" : "justify-center",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Image
                    src="/stack-logo/stack-ai-logo-redesign/icon-dark-no-bg.svg"
                    className="size-5 flex-shrink-0 cursor-pointer"
                    alt="Stack AI"
                    width={20}
                    height={20}
                    priority
                  />
                  {isSidebarExpanded && (
                    <Image
                      src="/stack-logo/stack-ai-logo-redesign/logo-text-dark.svg"
                      className="shrink-0 cursor-pointer"
                      alt="Stack AI"
                      width={56}
                      height={18}
                      priority
                    />
                  )}
                </div>
                {isSidebarExpanded && (
                  <TooltipProvider delayDuration={250}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => setIsSidebarPinned((p) => !p)}
                        >
                          {isSidebarPinned
                            ? <PanelLeftClose className="size-4" />
                            : <PanelLeftOpen className="size-4" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent align="end">
                        {isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Org switcher row */}
              <div className="w-full mt-4 mb-1">
                <SidebarButton
                  className="pl-2 pr-1"
                  tooltip="Antlio Testing"
                  tooltipDisabled={isSidebarExpanded}
                >
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-foreground/10 text-[9px] font-bold text-foreground">
                    A
                  </div>
                  {isSidebarExpanded && (
                    <span className="min-w-max flex-grow truncate text-[13px] font-medium">Antlio Testing</span>
                  )}
                </SidebarButton>
              </div>
            </SidebarHeader>

            {/* Nav items */}
            <SidebarContent className="overflow-y-auto">
              <SidebarButtonGroup className="pt-1">
                {navItems.map(({ key, label, Icon, href }) => {
                  const isActive =
                    activeNavKey
                      ? key === activeNavKey
                      : href ? pathname === href : false
                  return (
                    <SidebarButton
                      key={key}
                      className="pl-2 pr-1"
                      isActive={isActive}
                      tooltip={label}
                      tooltipDisabled={isSidebarExpanded}
                      onClick={() => href && router.push(href)}
                    >
                      <Icon />
                      {isSidebarExpanded && <span className="min-w-max flex-grow">{label}</span>}
                    </SidebarButton>
                  )
                })}
              </SidebarButtonGroup>
            </SidebarContent>

            {/* Footer items */}
            <SidebarFooter className="relative flex flex-col gap-0.5 pb-4 bg-background">
              <div className="pointer-events-none absolute bottom-full h-10 w-full bg-gradient-to-t from-background" />

              {footerItems.map(({ key, label, Icon, dot }) => (
                <SidebarButton
                  key={key}
                  className="pl-2 pr-1"
                  tooltip={label}
                  tooltipDisabled={isSidebarExpanded}
                >
                  <span className="relative flex items-center justify-center size-4">
                    <Icon className="size-4" />
                    {dot && (
                      <span
                        className={cn(
                          "absolute -right-0.5 -top-0.5 h-[5px] w-[5px] rounded-full ring-1 ring-white",
                          dot,
                        )}
                      />
                    )}
                  </span>
                  {isSidebarExpanded && <span className="min-w-max flex-grow">{label}</span>}
                </SidebarButton>
              ))}

              {/* Profile button */}
              <SidebarButton
                className="mt-1 pl-2 pr-1"
                tooltip="Profile"
                tooltipDisabled={isSidebarExpanded}
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-foreground/10 text-[10px] font-semibold text-foreground">
                  D
                </div>
                {isSidebarExpanded && (
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] font-medium leading-tight">David Hidalgo</span>
                    <span className="truncate text-[11px] text-muted-foreground leading-tight">dhidalgo@stack-ai.com</span>
                  </div>
                )}
              </SidebarButton>
            </SidebarFooter>
          </div>
        </Sidebar>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
