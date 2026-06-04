'use client'

import { Tooltip } from '@base-ui/react/tooltip'

const TOOLTIP_DELAY_MS = 250
const TOOLTIP_CLOSE_DELAY_MS = 150

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  // eslint-disable-next-line react/no-context-provider -- Tooltip.Provider is a Base UI component, not a React context
  <Tooltip.Provider delay={TOOLTIP_DELAY_MS} closeDelay={TOOLTIP_CLOSE_DELAY_MS}>
    {children}
  </Tooltip.Provider>
)
