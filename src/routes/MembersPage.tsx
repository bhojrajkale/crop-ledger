import { useState } from 'react'
import { useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Card, EmptyState } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Chip'
import { countMemberExpenses } from '../domain/settlement'
import { initials } from '../lib/format'
import { useT } from '../i18n'
import { newId } from '../lib/id'
import type { Member } from '../domain/types'

export function MembersPage() {
  const { cropId } = useParams<{ cropId: string }>()
  const crops = useLedgerStore((s) => s.crops)
  const expenses = useLedgerStore((s) => s.expenses)
  const setMembers = useLedgerStore((s) => s.setMembers)
  const t = useT()

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
      setError(t('duplicateMember'))
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
            label={t('addSomeone')}
            placeholder={t('name')}
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
            {t('add')}
          </Button>
        </div>
      </Card>

      {members.length === 0 ? (
        <EmptyState
          emoji="👥"
          title={t('noMembersTitle')}
          description={t('noMembersBody')}
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
                        ? t('noExpensesYet')
                        : t('onNExpenses', {
                            count: t('expenses', { count }),
                          })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t('renameMember', { name: member.name })}
                    onClick={() => setRenaming(member)}
                  >
                    ✏️
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t('removeMember', { name: member.name })}
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
  const t = useT()
  const [value, setValue] = useState('')

  return (
    <Modal
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
        else setValue(member?.name ?? '')
      }}
      title={t('rename')}
      footer={
        <Button
          variant="primary"
          fullWidth
          disabled={!value.trim()}
          onClick={() => {
            if (member) void onSave({ ...member, name: value.trim() })
          }}
        >
          {t('save')}
        </Button>
      }
    >
      <Field
        label={t('name')}
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
  const t = useT()
  return (
    <Modal
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={t('removeMemberTitle', { name: member?.name ?? '' })}
      footer={
        <div className="flex gap-2">
          <Button fullWidth onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button variant="danger" fullWidth onClick={() => void onConfirm()}>
            {t('remove')}
          </Button>
        </div>
      }
    >
      {expenseCount > 0 ? (
        // Removing does not rewrite history: past expenses keep this id, so
        // their share drops out of the balances and the old rows stop naming
        // anyone. Better to say so than to silently change the settlement.
        <p className="text-sm text-[var(--muted)]">
          {t('removeMemberWarning', {
            count: t('expenses', { count: expenseCount }),
          })}
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">{t('removeMemberSafe')}</p>
      )}
    </Modal>
  )
}
