'use client'

import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      closeButton={false}
      toastOptions={{
        classNames: {
          toast:
            'group toast !bg-white !text-gray-900 !border-gray-200 !shadow-lg',
          title: '!text-gray-900 !font-medium',
          description: '!text-gray-500',
          actionButton:
            '!bg-gray-900 !text-white !border-0 !rounded-md !text-sm !font-medium hover:!bg-gray-700',
          cancelButton:
            '!bg-gray-100 !text-gray-500',
          icon: '!text-gray-900',
          closeButton: '!hidden',
          success: '!text-gray-900',
          error: '!text-gray-900',
          info: '!text-gray-900',
          warning: '!text-gray-900',
          loader: '!text-gray-900',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
