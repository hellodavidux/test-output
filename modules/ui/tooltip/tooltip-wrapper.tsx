'use client'

import type { ComponentProps, ReactElement, ReactNode } from 'react'

import { Tooltip } from '@base-ui/react/tooltip'

import { cn } from '@/lib/utils'

type PositionerProps = ComponentProps<typeof Tooltip.Positioner>

const TOOLTIP_COLLISION_PADDING = 10
const TOOLTIP_SIDE_OFFSET = 6
const TOOLTIP_POPUP_CLASSES =
  'max-w-xs rounded-stack-md bg-stack-background px-2.5 py-1.5 text-xs text-stack-foreground shadow-stack-dropdown'

export interface TooltipWrapperProps {
  content?: ReactNode
  side?: PositionerProps['side']
  align?: PositionerProps['align']
  sideOffset?: number
  contentClassName?: string
  disabled?: boolean
  children: ReactElement
}

export const TooltipWrapper = ({
  content,
  side = 'top',
  align,
  sideOffset = TOOLTIP_SIDE_OFFSET,
  contentClassName,
  disabled,
  children,
}: TooltipWrapperProps) => {
  if (!content || disabled) return children

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={TOOLTIP_COLLISION_PADDING}
          className="z-[99]"
        >
          <Tooltip.Popup className={cn(TOOLTIP_POPUP_CLASSES, contentClassName)}>
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
