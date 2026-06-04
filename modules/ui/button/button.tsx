import type { ButtonPrimitiveProps } from '@/modules/ui/button/button-primitive'
import type { ButtonIconPosition, ButtonSizes } from '@/modules/ui/button/types'
import type { IconComponent } from '@/modules/ui/icon/types'

import { cn } from '@/lib/utils'
import { ButtonPrimitive } from '@/modules/ui/button/button-primitive'
import { BUTTON_ICON_CLASS, BUTTON_SIZE_CLASSES } from '@/modules/ui/button/types'
import { Spinner } from '@/modules/ui/button/utils'

/**
 * Always-present label wrapper. When loading without an icon slot,
 * the text goes invisible while a centered spinner overlays the button,
 * preserving the button's intrinsic width. Markup stays stable across states.
 */
const ButtonLabel = ({ children, showSpinner }: { children: string, showSpinner: boolean }) => (
  <>
    <span className={cn(showSpinner && 'opacity-0 select-none pointer-events-none')}>
      {children}
    </span>
    {showSpinner && (
      <span className="absolute inset-0 flex items-center justify-center">
        <Spinner />
      </span>
    )}
  </>
)

const IconSlot = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn('inline-flex shrink-0 items-center justify-center', className)}>
    {children}
  </span>
)

interface ButtonProps extends ButtonPrimitiveProps {
  children: string
  icon?: IconComponent
  iconPosition?: ButtonIconPosition
  size?: ButtonSizes
  isLoading?: boolean
  className?: string
}

export const Button = ({
  children,
  icon: Icon,
  iconPosition = 'left',
  size = 'md',
  isLoading = false,
  className,
  ...props
}: ButtonProps) => {
  const iconClass = BUTTON_ICON_CLASS[size]
  const isLeftIcon = Icon && iconPosition === 'left'
  const isRightIcon = Icon && iconPosition === 'right'

  return (
    <ButtonPrimitive
      isLoading={isLoading}
      className={cn(
        BUTTON_SIZE_CLASSES[size],
        isLeftIcon && 'gap-1.5 pl-2.5 pr-3',
        isRightIcon && 'gap-1.5 pl-3 pr-2.5',
        className,
      )}
      {...props}
    >
      {isLeftIcon && (
        <IconSlot className={iconClass}>
          {isLoading ? <Spinner className={iconClass} /> : <Icon className={cn('shrink-0', iconClass)} strokeWidth={1.5} />}
        </IconSlot>
      )}
      <ButtonLabel showSpinner={isLoading && !Icon}>{children}</ButtonLabel>
      {isRightIcon && (
        <IconSlot className={iconClass}>
          {isLoading ? <Spinner className={iconClass} /> : <Icon className={cn('shrink-0', iconClass)} strokeWidth={1.5} />}
        </IconSlot>
      )}
    </ButtonPrimitive>
  )
}

Button.displayName = 'Button'
