'use client'

/**
 * Sidebar UI primitive — adapted from Stack AI production
 * (stackai/services/stackweb/components/ui/sidebar.tsx)
 */

import type { VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from 'react'

import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const DEFAULT_SIDEBAR_WIDTH = '220px'
const DEFAULT_COLLAPSED_SIDEBAR_WIDTH = '48px'

interface SidebarContextValue {
  collapsed: boolean
  collapsible: boolean
  setCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export type SidebarProps = HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
  collapsible?: boolean
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  width?: number | string
  collapsedWidth?: number | string
}

export type SidebarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: ReactNode
  tooltipDisabled?: boolean
  variant?: VariantProps<typeof sidebarButtonVariants>['variant']
  withGradient?: boolean
}

interface SidebarButtonActionProps extends ComponentPropsWithoutRef<'div'> {
  asChild?: boolean
}

const toCssDimension = (value: number | string | undefined, fallback: string): string => {
  if (value === undefined) return fallback
  return typeof value === 'number' ? `${value}px` : value
}

export const sidebarButtonVariants = cva(
  'group relative flex h-[1.875rem] w-full min-w-0 items-center justify-start gap-2 overflow-hidden rounded-md text-[13px] px-2 py-1 text-start transition-colors hover:bg-muted after:pointer-events-none after:absolute after:right-0 after:h-full after:w-12 after:rounded-md after:bg-gradient-to-l after:transition-colors after:content-[""] [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[1.75]',
  {
    variants: {
      isActive: { true: 'bg-sidebar-accent' },
      withGradient: {
        true: 'after:from-background group-hover:after:from-gray-100',
        false: 'after:from-transparent',
      },
      variant: {
        default: '',
        destructive: 'text-destructive hover:bg-destructive/10',
      },
    },
    defaultVariants: {
      isActive: false,
      withGradient: false,
    },
  },
)

export const useSidebar = (): SidebarContextValue => {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a Sidebar')
  }
  return context
}

export const Sidebar = ({
  asChild = false,
  collapsible = false,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  width,
  collapsedWidth = 48,
  className,
  style,
  ...props
}: SidebarProps) => {
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed)
  const isControlled = collapsed !== undefined
  const currentCollapsed = isControlled ? collapsed : uncontrolledCollapsed

  const setCollapsed = useCallback(
    (nextCollapsed: boolean) => {
      if (!isControlled) setUncontrolledCollapsed(nextCollapsed)
      onCollapsedChange?.(nextCollapsed)
    },
    [isControlled, onCollapsedChange],
  )

  const Comp = asChild ? Slot : 'div'
  const resolvedWidth = toCssDimension(width, DEFAULT_SIDEBAR_WIDTH)
  const resolvedCollapsedWidth = toCssDimension(collapsedWidth, DEFAULT_COLLAPSED_SIDEBAR_WIDTH)
  const shouldApplyWidth = collapsible || width !== undefined

  const contextValue = useMemo(
    () => ({ collapsed: Boolean(collapsible && currentCollapsed), collapsible, setCollapsed }),
    [collapsible, currentCollapsed, setCollapsed],
  )

  return (
    <SidebarContext value={contextValue}>
      <Comp
        className={cn('flex min-h-0 flex-col bg-background', className)}
        style={{
          width: shouldApplyWidth
            ? collapsible && currentCollapsed ? resolvedCollapsedWidth : resolvedWidth
            : undefined,
          ...style,
        }}
        {...props}
      />
    </SidebarContext>
  )
}

export const SidebarHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(className)} {...props} />
)

export const SidebarContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('min-h-0 flex-1 overflow-y-auto', className)} {...props} />
)

export const SidebarFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('shrink-0', className)} {...props} />
)

export const SidebarButtonGroup = ({ className, ...props }: HTMLAttributes<HTMLUListElement>) => (
  <ul role="list" className={cn('flex flex-col gap-0.5', className)} {...props} />
)

export const SidebarButton = ({
  asChild = false,
  isActive = false,
  tooltip,
  tooltipDisabled,
  withGradient = false,
  className,
  children,
  variant = 'default',
  ref,
  ...props
}: SidebarButtonProps & { ref?: React.Ref<HTMLButtonElement> }) => {
  const Comp = asChild ? Slot : 'button'

  const buttonNode = (
    <Comp
      ref={ref}
      type={asChild ? undefined : 'button'}
      className={cn(sidebarButtonVariants({ isActive, variant, withGradient }), className)}
      {...props}
    >
      {children}
    </Comp>
  )

  if (!tooltip || tooltipDisabled) {
    return buttonNode
  }

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">{buttonNode}</div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export const SidebarButtonLabel = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => {
  const context = useContext(SidebarContext)
  const isCollapsed = Boolean(context?.collapsible && context?.collapsed)

  return (
    <span
      className={cn('min-w-max flex-grow', isCollapsed && 'pointer-events-none w-0 opacity-0', className)}
      {...props}
    />
  )
}

export const SidebarButtonAction = ({
  asChild = false,
  className,
  ...props
}: SidebarButtonActionProps) => {
  const Comp = asChild ? Slot : 'div'

  return (
    <Comp
      className={cn(
        'pointer-events-none absolute right-0 z-20 flex h-full w-14 items-center justify-end rounded-md opacity-0 transition group-hover:opacity-100 group-hover:bg-gradient-to-l group-hover:from-muted',
        className,
      )}
      {...props}
    />
  )
}
