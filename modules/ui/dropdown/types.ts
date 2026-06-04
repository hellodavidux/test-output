import type { IconComponent } from '@/modules/ui/icon/types'

import { cva } from 'class-variance-authority'

import { DISABLED_CONTROL } from '@/modules/ui/consts'
import { FIELD_STATUS_CLASSES } from '@/modules/ui/field/types'

export interface SelectOption {
  value: string
  label: string
  icon?: IconComponent
}

export interface ComboboxOption<T = unknown> extends SelectOption {
  data?: T
}

/** Default max height for dropdown content (300px, clamped to available space). */
export const DROPDOWN_MAX_HEIGHT_DEFAULT = 300

export const DROPDOWN_POSITIONER_CLASSES = 'z-[110]'

export const DROPDOWN_CONTENT_CLASSES =
  'flex flex-col gap-1 overflow-y-auto rounded-stack-lg bg-stack-background p-1 shadow-stack-dropdown'

export const DROPDOWN_TRIGGER_SIZE = 'h-8 pl-3 pr-2 py-2 text-sm leading-5 rounded-stack-md'

export const DROPDOWN_TRIGGER_BASE =
  'relative inline-flex min-w-0 items-center justify-between gap-1 overflow-visible whitespace-nowrap font-normal text-stack-foreground bg-stack-background hover:bg-stackai-black-100 dark:hover:bg-stackai-black-800 transition-[color,background-color,box-shadow] outline-none focus-visible:outline-none focus-visible:shadow-stack-focus-ring'

export const dropdownTriggerVariants = cva(
  `${DROPDOWN_TRIGGER_BASE} ${DISABLED_CONTROL}`,
  {
    variants: {
      status: FIELD_STATUS_CLASSES,
    },
    defaultVariants: {
      status: 'default',
    },
  },
)

export const BASE_UI_ANIMATION_CLASSES =
  'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
