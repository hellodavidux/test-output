/**
 * Ccollapsible tree component for nested file/folder structures
 *
 * @example
 * ```tsx
 *
 * <TreeCollapsibleRoot defaultOpen>
 *   <TreeCollapsibleTrigger className="px-2">
 *     <TreeCollapsibleIcon>
 *       <FolderIcon className="size-4" />
 *     </TreeCollapsibleIcon>
 *     <TreeCollapsibleTitle>Title</TreeCollapsibleTitle>
 *     <TreeCollapsibleChevron />
 *   </TreeCollapsibleTrigger>
 *   <TreeCollapsibleContent>
 *     <div className="py-1 px-2">Content 1</div>
 *     <div className="py-1 px-2">Content 2</div>
 *   </TreeCollapsibleContent>
 * </TreeCollapsibleRoot>
 * ```
 */

import { ChevronDownIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

import { useMounted } from '@/hooks/use-mounted'
import { cn } from '@/lib/utils'

interface TreeCollapsibleContextValue {
  isOpen: boolean
  disabled: boolean
  toggle: () => void
}

const TreeCollapsibleContext = createContext<TreeCollapsibleContextValue | null>(null)

const useTreeCollapsible = () => {
  const context = useContext(TreeCollapsibleContext)
  if (!context) {
    throw new Error('TreeCollapsible components must be used within TreeCollapsibleRoot')
  }
  return context
}

interface TreeCollapsibleProps {
  children: React.ReactNode
  defaultOpen?: boolean
  disabled?: boolean
  reopenTrigger?: unknown
}

export const TreeCollapsibleRoot = ({
  children,
  defaultOpen = true,
  disabled = false,
  reopenTrigger,
}: TreeCollapsibleProps) => {
  const prevTriggerRef = useRef(reopenTrigger)
  const triggerChanged = reopenTrigger !== prevTriggerRef.current
  if (triggerChanged) {
    prevTriggerRef.current = reopenTrigger
  }

  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (triggerChanged && !isOpen) {
    setIsOpen(true)
  }

  const toggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev)
    }
  }, [disabled])

  const contextValue = useMemo(
    () => ({ isOpen, disabled, toggle }),
    [isOpen, disabled, toggle],
  )

  return (
    <TreeCollapsibleContext value={contextValue}>
      {children}
    </TreeCollapsibleContext>
  )
}

interface TreeCollapsibleTriggerProps {
  children: React.ReactNode
  className?: string
  /** Sticky offset from top in pixels */
  stickyTop?: number
  /** Z-index for sticky stacking (higher = on top) */
  stickyZIndex?: number
  /** Additional padding on sticky wrapper (e.g., for root group spacing) */
  stickyPadding?: string
}

export const TreeCollapsibleTrigger = ({
  children,
  className,
  stickyTop = 0,
  stickyZIndex = 30,
  stickyPadding,
}: TreeCollapsibleTriggerProps) => {
  const { disabled, toggle } = useTreeCollapsible()

  return (
    <div
      className={cn('sticky bg-popover', stickyPadding)}
      style={{ top: stickyTop, zIndex: stickyZIndex }}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex w-full items-center gap-2 rounded-md py-1.5 text-sm cursor-pointer hover:bg-accent disabled:cursor-default disabled:hover:bg-transparent',
          className,
        )}
        disabled={disabled}
      >
        {children}
      </button>
    </div>
  )
}

interface TreeCollapsibleIconProps {
  children: React.ReactNode
  className?: string
}

export const TreeCollapsibleIcon = ({
  children,
  className,
}: TreeCollapsibleIconProps) => (
  <span className={cn('text-muted-foreground', className)}>{children}</span>
)

interface TreeCollapsibleTitleProps {
  children: React.ReactNode
  className?: string
  /** Whether to add left padding when there's no icon */
  noIconPadding?: boolean
}

export const TreeCollapsibleTitle = ({
  children,
  className,
  noIconPadding = false,
}: TreeCollapsibleTitleProps) => (
  <span className={cn('truncate', noIconPadding && 'pl-1', className)}>{children}</span>
)

interface TreeCollapsibleChevronProps {
  className?: string
}

export const TreeCollapsibleChevron = ({
  className,
}: TreeCollapsibleChevronProps) => {
  const { isOpen, disabled } = useTreeCollapsible()

  if (disabled) {
    return null
  }

  return (
    <ChevronDownIcon
      className={cn(
        'ml-auto size-4 text-muted-foreground transition-transform duration-200',
        isOpen && 'rotate-180',
        className,
      )}
    />
  )
}

interface TreeCollapsibleContentProps {
  children: React.ReactNode
  className?: string
}

export const TreeCollapsibleContent = ({
  children,
  className,
}: TreeCollapsibleContentProps) => {
  const mounted = useMounted()
  const { isOpen, disabled } = useTreeCollapsible()
  const showContent = disabled || isOpen

  return (
    <AnimatePresence>
      {showContent && (
        <motion.div
          initial={{ height: mounted ? 0 : 'auto', overflow: 'hidden' }}
          animate={{ height: 'auto', overflow: 'visible' }}
          exit={{ height: mounted ? 0 : 'auto', overflow: 'hidden' }}
        >
          <div className={cn('ml-4 border-l pl-1.5 space-y-0.5', className)}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
