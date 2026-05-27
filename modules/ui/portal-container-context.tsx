'use client'

import * as React from 'react'

const PortalContainerContext = React.createContext<HTMLElement | null>(null)

export const PortalContainerProvider = ({
  value,
  children,
}: {
  value: HTMLElement | null
  children: React.ReactNode
}) => (
  <PortalContainerContext.Provider value={value}>
    {children}
  </PortalContainerContext.Provider>
)

export const usePortalContainer = () => React.useContext(PortalContainerContext)
