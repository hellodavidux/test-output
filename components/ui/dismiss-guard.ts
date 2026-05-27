/**
 * Guards Radix DismissableLayer from dismissing when interacting with
 * react-resizable-panels resize handles.
 *
 * In react-resizable-panels v4.3.1+, the library's capture-phase pointerdown
 * handler calls `separator.focus()` which dispatches focusin/pointerdown events
 * that Radix interprets as "outside" interactions. The events don't always go
 * through the handle element itself (they can target overlays or intermediate
 * elements), so the fix must be at the dismiss layer (Dialog, Popover, etc.),
 * not on the handle.
 *
 * Usage: wrap handler props on any Radix Content component:
 *
 * ```tsx
 * <DialogPrimitive.Content
 *   onPointerDownOutside={guardResizeDismiss(onPointerDownOutside)}
 *   onFocusOutside={guardResizeDismiss(onFocusOutside)}
 *   {...props}
 * />
 * ```
 */

const isResizeHandleInteraction = (event: CustomEvent<{ originalEvent: Event }>) => {
  const target = event.detail.originalEvent.target

  if (target instanceof HTMLElement && target.closest('[data-slot="resizable-handle"]')) {
    return true
  }

  // The library programmatically focuses the handle during resize —
  // check if the currently focused element is a resize handle.
  if (document.activeElement?.closest('[data-slot="resizable-handle"]')) {
    return true
  }

  return false
}

export const guardResizeDismiss = <E extends CustomEvent<{ originalEvent: Event }>>(
  handler?: (event: E) => void,
) => (event: E) => {
  if (isResizeHandleInteraction(event)) {
    event.preventDefault()
    return
  }

  handler?.(event)
}

/** Portaled popovers/selects rendered outside the dialog content node. */
const PORTALED_OVERLAY_SELECTOR = [
  '[data-slot="popover-content"]',
  '[data-radix-select-content]',
  '[data-radix-popper-content-wrapper]',
  '[role="listbox"]',
].join(',')

const isPortaledOverlayInteraction = (event: { target: EventTarget | null }) => {
  const target = event.target
  return target instanceof HTMLElement && !!target.closest(PORTALED_OVERLAY_SELECTOR)
}

/** Keep dialogs open when clicking portaled child overlays (combobox, legacy Select). */
export const guardPortaledOverlayDismiss = <E extends { preventDefault: () => void; target: EventTarget | null }>(
  handler?: (event: E) => void,
) => (event: E) => {
  if (isPortaledOverlayInteraction(event)) {
    event.preventDefault()
    return
  }

  handler?.(event)
}

export const blurResizeHandle = () => {
  const active = document.activeElement
  if (active instanceof HTMLElement && active.closest('[data-slot="resizable-handle"]')) {
    active.blur()
  }
}
