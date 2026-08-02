import { Modal } from '../ui/Modal'
import { formatINR } from '../../domain/money'
import type { BalanceBreakdown } from '../../domain/settlement'
import type { Member } from '../../domain/types'
import { useT } from '../../i18n'

/**
 * Where one person's settlement figure comes from.
 *
 * The figure alone invites the wrong reading — with a harvest recorded, most
 * of what someone appears to owe is the group's sale money sitting in their
 * pocket, not a debt they ran up. Laid out as four lines it is obvious, and
 * it can be shown to the person being asked to pay.
 */
export function BalanceBreakdownModal({
  member,
  parts,
  onClose,
}: {
  member: Member | null
  parts: BalanceBreakdown | null
  onClose: () => void
}) {
  const t = useT()

  return (
    <Modal
      open={member !== null && parts !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t('howWorkedOut')}
      {...(member ? { description: member.name } : {})}
    >
      {parts ? (
        <div className="space-y-1">
          <Line label={t('breakdownPaidOut')} amount={parts.paidOut} sign="+" />
          <Line
            label={t('breakdownExpenseShare')}
            amount={parts.expenseShare}
            sign="−"
          />
          {/* Harvest lines only when there has been one, so an ordinary
              mid-season settlement stays two lines long. */}
          {parts.revenueShare > 0 || parts.revenueHeld > 0 ? (
            <>
              <Line
                label={t('breakdownRevenueShare')}
                amount={parts.revenueShare}
                sign="+"
              />
              <Line
                label={t('breakdownRevenueHeld')}
                amount={parts.revenueHeld}
                sign="−"
              />
            </>
          ) : null}
          {/* Likewise: only shown once somebody has actually squared up, so
              the sum does not grow lines that are all zero. */}
          {parts.settlementsPaid > 0 || parts.settlementsReceived > 0 ? (
            <>
              <Line
                label={t('breakdownSettlementsPaid')}
                amount={parts.settlementsPaid}
                sign="+"
              />
              <Line
                label={t('breakdownSettlementsReceived')}
                amount={parts.settlementsReceived}
                sign="−"
              />
            </>
          ) : null}

          <div className="flex items-baseline justify-between gap-3 pt-3 mt-2 border-t border-[var(--divider)]">
            <span className="font-medium text-[var(--ink)]">
              {parts.balance === 0
                ? t('settled')
                : parts.balance > 0
                  ? t('breakdownGets')
                  : t('breakdownOwes')}
            </span>
            <span
              className="font-bold tnum text-lg shrink-0"
              style={{
                color:
                  parts.balance > 0
                    ? 'var(--positive)'
                    : parts.balance < 0
                      ? 'var(--negative)'
                      : 'var(--muted)',
              }}
            >
              {formatINR(Math.abs(parts.balance))}
            </span>
          </div>

          {parts.revenueHeld > 0 ? (
            <p className="text-sm text-[var(--muted)] pt-3">
              {t('breakdownHoldingNote', {
                amount: formatINR(parts.revenueHeld),
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}

function Line({
  label,
  amount,
  sign,
}: {
  label: string
  amount: number
  sign: '+' | '−'
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="tnum text-[var(--ink)] shrink-0">
        {/* The sign is what makes this readable as a sum rather than a list. */}
        <span className="text-[var(--faint)]">{sign} </span>
        {formatINR(amount)}
      </span>
    </div>
  )
}
