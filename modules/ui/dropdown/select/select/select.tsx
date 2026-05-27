'use client'

import type { VariantProps } from 'class-variance-authority'

import type { SelectOption } from '@/modules/ui/dropdown/types'

import { Select as BaseSelect } from '@base-ui/react/select'
import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'

import { cn } from '@/lib/utils'
import { BUTTON_ICON_CLASS } from '@/modules/ui/button/types'
import { DropdownIconSlot } from '@/modules/ui/dropdown/dropdown-icon-slot'
import {
  DROPDOWN_ITEM_CLASSES,
  DROPDOWN_ITEM_SELECTED_CLASSES,
  DropdownItemShape,
} from '@/modules/ui/dropdown/dropdown-item'
import { DropdownSeparator } from '@/modules/ui/dropdown/dropdown-separator'
import {
  BASE_UI_ANIMATION_CLASSES,
  DROPDOWN_CONTENT_CLASSES,
  DROPDOWN_MAX_HEIGHT_DEFAULT,
  DROPDOWN_POSITIONER_CLASSES,
  DROPDOWN_TRIGGER_SIZE,
  dropdownTriggerVariants,
} from '@/modules/ui/dropdown/types'
import { usePortalContainer } from '@/modules/ui/portal-container-context'

const SELECT_ITEM_INDICATOR = (
  <BaseSelect.ItemIndicator aria-hidden="true">
    <CheckIcon className="size-3.5" strokeWidth={1.5} />
  </BaseSelect.ItemIndicator>
)

export type { SelectOption } from '@/modules/ui/dropdown/types'

const SelectContext = createContext<SelectOption | null>(null)

interface SelectProps {
  children?: React.ReactNode
  value?: SelectOption | null
  defaultValue?: SelectOption | null
  onValueChange?: (option: SelectOption) => void
  isDisabled?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

const Select = ({ children, value, defaultValue, onValueChange, isDisabled, ...props }: SelectProps) => {
  const [internalSelection, setInternalSelection] = useState<SelectOption | null>(defaultValue ?? null)

  const selectedOption = value !== undefined ? value : internalSelection

  const handleValueChange = useCallback((option: SelectOption | null) => {
    if (option) {
      if (value === undefined) setInternalSelection(option)
      onValueChange?.(option)
    }
  }, [value, onValueChange])

  const valueProps = value !== undefined
    ? { value }
    : { defaultValue }

  return (
    <SelectContext value={selectedOption}>
      <BaseSelect.Root
        modal={false}
        {...valueProps}
        isItemEqualToValue={(a: SelectOption, b: SelectOption) => a.value === b.value}
        onValueChange={handleValueChange}
        disabled={isDisabled}
        {...props}
      >
        {children}
      </BaseSelect.Root>
    </SelectContext>
  )
}

const SelectGroup = ({ className, ...props }: React.ComponentPropsWithRef<'div'>) => (
  <BaseSelect.Group className={cn('flex flex-col gap-1', className)} {...props} />
)

interface SelectTriggerProps
  extends React.ComponentPropsWithRef<'button'>,
  VariantProps<typeof dropdownTriggerVariants> {
  placeholder?: string
}

const SelectTrigger = ({ className, status, placeholder = 'Select...', ref, ...props }: SelectTriggerProps) => {
  const selectedOption = useContext(SelectContext)

  return (
    <BaseSelect.Trigger
      ref={ref}
      className={cn(dropdownTriggerVariants({ status }), DROPDOWN_TRIGGER_SIZE, className)}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {selectedOption?.icon && <DropdownIconSlot Icon={selectedOption.icon} aria-hidden="true" />}
        <span className="min-w-0 truncate">
          {selectedOption
            ? selectedOption.label
            : <span className="text-stack-foreground/30">{placeholder}</span>}
        </span>
      </span>
      <BaseSelect.Icon aria-hidden="true">
        <ChevronDownIcon className={cn(BUTTON_ICON_CLASS.md, 'shrink-0')} strokeWidth={1.5} />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  )
}

interface SelectContentProps extends React.ComponentPropsWithRef<'div'> {
  maxHeight?: number
  align?: BaseSelect.Positioner.Props['align']
  side?: BaseSelect.Positioner.Props['side']
  sideOffset?: BaseSelect.Positioner.Props['sideOffset']
}

const SelectContent = ({
  className,
  children,
  maxHeight = DROPDOWN_MAX_HEIGHT_DEFAULT,
  align,
  side,
  sideOffset = 4,
  ref,
  ...props
}: SelectContentProps) => {
  const portalContainer = usePortalContainer()

  return (
    <BaseSelect.Portal container={portalContainer ?? undefined}>
      <BaseSelect.Positioner
        className={cn(DROPDOWN_POSITIONER_CLASSES, 'pointer-events-auto')}
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignItemWithTrigger={false}
      >
        <BaseSelect.Popup
          ref={ref}
          className={cn(
            DROPDOWN_CONTENT_CLASSES,
            'outline-none',
            BASE_UI_ANIMATION_CLASSES,
            'w-[var(--anchor-width)]',
            className,
          )}
          style={{ maxHeight: `min(${maxHeight}px, var(--available-height, ${maxHeight}px))` }}
          {...props}
        >
          {children}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  )
}

interface SelectItemProps extends React.ComponentPropsWithRef<'div'> {
  value: SelectOption
}

const SelectItem = ({ className, children, ref, value, ...props }: SelectItemProps) => {
  const hasCustomChildren = !!children
  const defaultLeading = !hasCustomChildren && value.icon
    ? <DropdownIconSlot Icon={value.icon} />
    : undefined
  const defaultTrailing = hasCustomChildren ? undefined : SELECT_ITEM_INDICATOR

  return (
    <BaseSelect.Item
      ref={ref}
      value={value}
      className={cn(
        DROPDOWN_ITEM_CLASSES,
        DROPDOWN_ITEM_SELECTED_CLASSES,
        'cursor-pointer',
        className,
      )}
      {...props}
    >
      <DropdownItemShape leading={defaultLeading} trailing={defaultTrailing}>
        <BaseSelect.ItemText>{children ?? value.label}</BaseSelect.ItemText>
      </DropdownItemShape>
    </BaseSelect.Item>
  )
}

const SelectLabel = ({ className, ref, ...props }: React.ComponentPropsWithRef<'div'>) => (
  <BaseSelect.GroupLabel
    ref={ref}
    className={cn('px-2 py-1 text-xs font-medium text-stackai-black-500', className)}
    {...props}
  />
)

const SelectSeparator = ({ ref, ...props }: React.ComponentPropsWithRef<'div'>) => (
  <BaseSelect.Separator render={<DropdownSeparator ref={ref} {...props} />} />
)

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
}
