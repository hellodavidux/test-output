import type { ButtonPrimitiveProps } from '@/modules/ui/button/button-primitive'
import type { ButtonSizes } from '@/modules/ui/button/types'
import type { IconComponent } from '@/modules/ui/icon/types'
import type { TooltipWrapperProps } from '@/modules/ui/tooltip/tooltip-wrapper'

import { cn } from '@/lib/utils'
import { ButtonPrimitive } from '@/modules/ui/button/button-primitive'
import { BUTTON_ICON_CLASS, ICON_BUTTON_SIZE_CLASSES } from '@/modules/ui/button/types'
import { Spinner } from '@/modules/ui/button/utils'

interface IconButtonProps extends ButtonPrimitiveProps {
  Icon: IconComponent
  size?: ButtonSizes
  isLoading?: boolean
  tooltip: string
  tooltipSide?: TooltipWrapperProps['side']
  ariaLabel: string
}

const IconButton = ({
  Icon,
  size = 'md',
  isLoading = false,
  tooltip,
  tooltipSide = 'top',
  className,
  ariaLabel,
  ...props
}: IconButtonProps) => (
  <ButtonPrimitive
    isLoading={isLoading}
    tooltip={tooltip}
    tooltipSide={tooltipSide}
    className={cn(ICON_BUTTON_SIZE_CLASSES[size], className)}
    aria-label={ariaLabel}
    {...props}
  >
    {isLoading ? <Spinner className={BUTTON_ICON_CLASS[size]} /> : <Icon className={cn('shrink-0', BUTTON_ICON_CLASS[size])} strokeWidth={1.5} />}
  </ButtonPrimitive>
)

IconButton.displayName = 'IconButton'

export { IconButton }
