import { useState } from 'react'
import { useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Card, EmptyState } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Chip'
import { countMemberExpenses } from '../domain/settlement'
import { initials, pluralize } from '../lib/format'
import { newId } from '../lib/id'
import type { Member } from '../domain/types'

export function MembersPage() {
  const { cropId } = useParams<{ cropId: string }>()
  const crops = useLedgerStore((s) => s.crops)
  const expenses = useLedgerStore((s) => s.expenses)
  const setMembers = useLedgerStore((s) => s.setMembers)

  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [renaming, setRenaming] = useState<Member | null>(null)
  const [removing, setRemoving] = useState<Member | null>(null)

  const crop = crops.find((c) => c.id === cropId)
  if (!crop) return null
  const members = crop.members

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('Someone with that name is already on this crop.')
      return
    }
    setError(undefined)
    setName('')
    await setMembers(crop.id, [...members, { id: newId(), name: trimmed }])
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-2 items-end">
          <Field
            label="Add someone"
            placeholder="Name"
            className="flex-1"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(undefined)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
            error={error}
          />
          <Button variant="primary" onClick={() => void add()} disabled={!name.trim()}>
            Add
          </Button>
        </div>
      </Card>

      {members.length === 0 ? (
        <EmptyState
          emoji="👥"
          title="Nobody added yet"
          description="Add everyone involved in this crop. You'll pick who paid and who owes each expense from this list."
        />
      ) : (
        <ul className="space-y-2">
          {members.map((member) => {
            const count = countMemberExpenses(expenses, member.id)
            return (
              <li key={member.id}>
                <Card className="flex items-center gap-3">
                  <Avatar initials={initials(member.name)} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--ink)] truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-[var(--faint)]">
                      {count === 0
                        ? 'No expenses yet'
                        : `On ${pluralize(count, 'expense')}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Rename ${member.name}`}
                    onClick={() => setRenaming(member)}
                  >
                    ✏️
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${member.name}`}
                    onClick={() => setRemoving(member)}
                  >
                    ×
                  </Button>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <RenameModal
        member={renaming}
        onClose={() => setRenaming(null)}
        onSave={async (updated) => {
          await setMembers(
            crop.id,
            members.map((m) => (m.id === updated.id ? updated : m))
          )
          setRenaming(null)
        }}
      />

      <RemoveModal
        member={removing}
        expenseCount={removing ? countMemberExpenses(expenses, removing.id) : 0}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return
          await setMembers(
            crop.id,
            members.filter((m) => m.id !== removing.id)
          )
          setRemoving(null)
        }}
      />
    </div>
  )
}

function RenameModal({
  member,
  onClose,
  onSave,
}: {
  member: Member | null
  onClose: () => void
  onSave: (member: Member) => Promise<void>
}) {
  const [value, setValue] = useState('')

  return (
    <Modal
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
        else setValue(member?.name ?? '')
      }}
      title="Rename"
      footer={
        <Button
          variant="primary"
          fullWidth
          disabled={!value.trim()}
          onClick={() => {
            if (member) void onSave({ ...member, name: value.trim() })
          }}
        >
          Save
        </Button>
      }
    >
      <Field
        label="Name"
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
      />
    </Modal>
  )
}

function RemoveModal({
  member,
  expenseCount,
  onClose,
  onConfirm,
}: {
  member: Member | null
  expenseCount: number
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  return (
    <Modal
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={`Remove ${member?.name ?? ''}?`}
      footer={
        <div className="flex gap-2">
          <Button fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth onClick={() => void onConfirm()}>
            Remove
          </Button>
        </div>
      }
    >
      {expenseCount > 0 ? (
        // Removing does not rewrite history: past expenses keep this id, so
        // their share drops out of the balances and the old rows stop naming
        // anyone. Better to say so than to silently change the settlement.
        <p className="text-sm text-[var(--muted)]">
          They appear on {pluralize(expenseCount, 'expense')}. Removing them
          leaves those expenses in place but drops their share from the
          settlement, which will change what everyone owes. Consider settling
          up first.
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          They aren&apos;t on any expenses, so nothing else changes.
        </p>
      )}
    </Modal>
  )
}
