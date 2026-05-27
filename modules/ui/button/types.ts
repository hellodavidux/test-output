export const BUTTON_SIZE_CLASSES = {
  xs: 'h-6 min-w-6 px-2 text-xs font-normal leading-4 rounded-stack-sm',
  sm: 'h-7 min-w-7 px-2.5 py-2 text-[13px] font-normal leading-5 rounded-stack-sm',
  md: 'h-8 min-w-8 px-3.5 py-2 text-sm font-normal leading-5 rounded-stack-md',
  lg: 'h-9 min-w-9 px-3 py-2 text-sm font-normal leading-5 rounded-stack-lg',
  xl: 'h-10 min-w-10 px-4 py-2 text-[15px] font-normal leading-7 rounded-stack-lg',
}

export type ButtonSizes = keyof typeof BUTTON_SIZE_CLASSES
export type ButtonIconPosition = 'left' | 'right'

export const ICON_BUTTON_SIZE_CLASSES: Record<ButtonSizes, string> = {
  xs: 'size-6 aspect-square rounded-stack-sm',
  sm: 'size-7 aspect-square rounded-stack-sm',
  md: 'size-8 aspect-square rounded-stack-md',
  lg: 'size-9 aspect-square rounded-stack-lg',
  xl: 'size-10 aspect-square rounded-stack-lg',
}

export const BUTTON_ICON_CLASS: Record<ButtonSizes, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-5.5',
}
