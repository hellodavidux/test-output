/**
 * Stack AI Button — compatibility shim for existing call-sites.
 *
 * All existing `import { Button } from "@/components/ui/button"` calls
 * now render using Stack AI design tokens (stackai-black, rounded-stack-*,
 * shadow-stack-btn-*, etc.) that match the ui-demo component exactly.
 *
 * Shadcn `variant` / `size` props are mapped to Stack AI equivalents:
 *   variant  default → primary intent  (dark filled)
 *   variant  outline / secondary → secondary intent  (subtle + border)
 *   variant  ghost → ghost intent
 *   variant  destructive* → danger intent
 *
 * For new code, prefer importing directly:
 *   import { Button }     from '@/modules/ui/button/button'      // label + optional icon prop
 *   import { IconButton } from '@/modules/ui/button/icon-button' // icon-only
 */
'use client'

import type { VariantProps } from 'class-variance-authority'

import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

// Shadcn-compatible API that applies Stack AI visual tokens
const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'font-normal transition-[color,background-color,box-shadow]',
    'focus-visible:outline-none focus-visible:shadow-stack-focus-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    'text-sm leading-5',
  ].join(' '),
  {
    variants: {
      variant: {
        // ── Stack AI primary intent ──────────────────────────────────────
        default:
          'bg-stackai-black-900 text-stackai-black-50 shadow-stack-btn-primary hover:bg-stackai-black-900/90 dark:bg-stackai-black-50 dark:text-stackai-black-900 dark:hover:bg-stackai-black-50/90',
        blue:
          'bg-blue-600 text-white shadow-sm hover:bg-blue-700',

        // ── Stack AI secondary intent — NO CSS border; the inset in shadow-stack-btn-secondary
        //    provides the border effect (matches button-primitive.tsx exactly)
        outline:
          'bg-stack-background text-stack-foreground shadow-stack-btn-secondary hover:bg-stackai-black-100 dark:hover:bg-stackai-black-800',
        secondary:
          'bg-stack-background text-stack-foreground shadow-stack-btn-secondary hover:bg-stackai-black-100 dark:hover:bg-stackai-black-800',

        // ── Stack AI ghost intent ────────────────────────────────────────
        ghost:
          'text-stack-foreground hover:bg-stack-foreground/[0.07]',

        // ── Stack AI danger intent ───────────────────────────────────────
        destructive:
          'bg-stackai-red-500 text-white shadow-sm hover:bg-stackai-red-600 dark:bg-stackai-red-500 dark:hover:bg-stackai-red-600',
        destructiveOutline:
          'border border-stackai-red-300 text-stackai-red-600 bg-stack-background hover:bg-stackai-red-50 dark:border-stackai-red-800 dark:text-stackai-red-400',
        destructiveGhost:
          'text-stackai-red-600 hover:bg-stackai-red-50 dark:text-stackai-red-400',
        'destructive-secondary':
          'bg-stackai-red-100 text-stackai-red-600 hover:bg-stackai-red-200 dark:bg-stackai-red-950 dark:text-stackai-red-400',

        // ── misc ────────────────────────────────────────────────────────
        muted: 'bg-muted text-foreground hover:bg-muted/80 text-left gap-2',
        link:  'text-primary underline-offset-4 hover:underline',
      },

      size: {
        // Stack AI md (default)
        default:   'h-8 min-w-8 rounded-stack-md px-3.5 py-2',
        // Stack AI sm
        sm:        'h-7 min-w-7 rounded-stack-sm px-2.5 py-1.5 text-[13px]',
        // Stack AI lg
        lg:        'h-9 min-w-9 rounded-stack-lg px-3 py-2',
        // Icon sizes (square)
        icon:      'h-8 w-8 aspect-square rounded-stack-md p-0',
        smallIcon: 'h-7 w-7 aspect-square rounded-stack-sm p-0',
        'icon-sm': 'h-7 w-7 aspect-square rounded-stack-sm p-0',
        'icon-lg': 'h-10 w-10 aspect-square rounded-stack-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonVariantsProps extends VariantProps<typeof buttonVariants> {}
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantsProps {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
