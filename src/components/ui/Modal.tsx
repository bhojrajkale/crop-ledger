import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { useT } from '../../i18n'

/**
 * Radix handles the focus trap, escape-to-close, scroll lock and aria wiring.
 * Hand-rolling those is a reliable source of subtle keyboard and screen-reader
 * bugs, so this one dependency earns its place.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const t = useT()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className={[
            'fixed z-[200] bg-[var(--surface)] flex flex-col',
            // Phone: a bottom sheet, thumb-reachable. Desktop: a centred card.
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-3xl',
            'sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2',
            'sm:-translate-x-1/2 sm:-translate-y-1/2',
            'sm:w-full sm:max-w-md sm:rounded-2xl sm:max-h-[85dvh]',
            'border border-[var(--hairline)]',
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-4 p-4 pb-3 border-b border-[var(--hairline)]">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-[var(--ink)]">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-sm text-[var(--muted)] mt-0.5">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">
                  {title}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={t('close')}
              className="shrink-0 -mt-1 -mr-1 size-9 rounded-full text-[var(--muted)] text-xl leading-none active:scale-95 transition-transform"
            >
              ×
            </Dialog.Close>
          </div>

          <div className="overflow-y-auto p-4 flex-1">{children}</div>

          {footer ? (
            <div className="p-4 pt-3 border-t border-[var(--hairline)] pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
