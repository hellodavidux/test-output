'use client'

import type { VariantProps } from 'class-variance-authority'

import * as SelectPrimitive from '@radix-ui/react-select'
import { cva } from 'class-variance-authority'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

const selectVariants = cva(
  'flex h-8 gap-2 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate [&>span]:text-left',
  {
    variants: {
      variant: {
        default: '',
        background: 'bg-muted border-border text-ms shadow-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

interface SelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>,
  VariantProps<typeof selectVariants> {
  showChevron?: boolean
  unstyled?: boolean
  size?: 'default' | 'sm'
  /** When true, renders ( value + chevron ) for compact inline selects */
  parenWrapped?: boolean
}

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(
  (
    {
      className,
      children,
      showChevron = true,
      variant,
      unstyled = false,
      size = 'default',
      parenWrapped = false,
      ...props
    },
    ref,
  ) => {
    const chevron = showChevron ? (
      <SelectPrimitive.Icon asChild>
        <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
      </SelectPrimitive.Icon>
    ) : null

    const sizeClass = size === 'sm' ? 'h-7 text-xs' : ''

    return (
      <SelectPrimitive.Trigger
        ref={ref}
        className={cn(!unstyled ? selectVariants({ variant }) : '', sizeClass, className)}
        {...props}
      >
        {parenWrapped ? (
          <span className="inline-flex max-w-full items-center gap-0">
            <span className="shrink-0 text-muted-foreground/80" aria-hidden>
              (
            </span>
            <span className="inline-flex min-w-0 items-center gap-1 overflow-hidden [&_svg]:shrink-0">
              {children}
              {chevron}
            </span>
            <span className="shrink-0 text-muted-foreground/80" aria-hidden>
              )
            </span>
          </span>
        ) : (
          <>
            {children}
            {chevron}
          </>
        )}
      </SelectPrimitive.Trigger>
    )
  },
)
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className,
    )}
    {...props}
  >
    <ChevronUpIcon />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1',
      className,
    )}
    {...props}
  >
    <ChevronDownIcon />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

interface SelectContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  container?: HTMLElement
  viewportClassName?: string
  /** When true, list opens scrolled to the top instead of jumping to the selected item. */
  startAtTop?: boolean
}

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(
  (
    {
      className,
      children,
      container,
      position = 'popper',
      viewportClassName,
      startAtTop = false,
      ...props
    },
    ref,
  ) => {
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    const viewportRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => {
      if (!startAtTop) return
      const reset = () => {
        const content = contentRef.current
        const viewport = viewportRef.current
        if (content) content.scrollTop = 0
        if (viewport) viewport.scrollTop = 0
      }
      reset()
      const t0 = window.setTimeout(reset, 0)
      const t1 = window.setTimeout(reset, 32)
      return () => {
        window.clearTimeout(t0)
        window.clearTimeout(t1)
      }
    }, [startAtTop])

    return (
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Content
          ref={(node) => {
            contentRef.current = node
            if (typeof ref === 'function') ref(node)
            else if (ref) ref.current = node
          }}
          className={cn(
            'relative z-[60] max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
            className,
          )}
          position={position}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            ref={viewportRef}
            className={cn(
              'p-1',
              position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
              viewportClassName,
            )}
          >
            {children}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    )
  },
)
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const selectItemClasses = 'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  /** When set, this text is shown in the closed trigger; `children` still render in the dropdown list. */
  itemText?: React.ReactNode
}

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, itemText, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(selectItemClasses, className)}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    {itemText != null ? (
      <>
        <SelectPrimitive.ItemText>{itemText}</SelectPrimitive.ItemText>
        {children}
      </>
    ) : (
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    )}
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
