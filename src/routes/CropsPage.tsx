import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Card, EmptyState, SectionTitle } from '../components/ui/Card'
import { CropModal } from '../components/crops/CropModal'
import { formatLongDate, pluralize } from '../lib/format'
import type { Crop } from '../domain/types'

export function CropsPage() {
  const crops = useLedgerStore((s) => s.crops)
  const loading = useLedgerStore((s) => s.loading)
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  const { active, archived } = useMemo(
    () => ({
      active: crops.filter((c) => !c.archived),
      archived: crops.filter((c) => c.archived),
    }),
    [crops]
  )

  return (
    <main className="max-w-2xl mx-auto px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mb-6 pr-12">
        <h1 className="text-2xl font-bold text-[var(--ink)]">Crop Ledger</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Track what each crop costs and who owes whom.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--muted)] px-1">Loading…</p>
      ) : crops.length === 0 ? (
        <EmptyState
          emoji="🌾"
          title="No crops yet"
          description="Start by adding the crop you're growing this season. You can add the people involved and their expenses next."
          action={
            <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
              Add your first crop
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>Growing</SectionTitle>
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              + New crop
            </Button>
          </div>

          {active.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--muted)]">
                Every crop is archived. Restore one below, or add a new crop.
              </p>
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {active.map((crop) => (
                <li key={crop.id}>
                  <CropRow crop={crop} />
                </li>
              ))}
            </ul>
          )}

          {archived.length > 0 ? (
            <div className="mt-8">
              <SectionTitle>Harvested &amp; archived</SectionTitle>
              <ul className="space-y-2.5">
                {archived.map((crop) => (
                  <li key={crop.id}>
                    <CropRow crop={crop} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-10 text-center">
        <Link
          to="/settings"
          className="text-sm text-[var(--muted)] underline underline-offset-4"
        >
          Backup &amp; restore
        </Link>
      </div>

      <CropModal
        open={creating}
        onOpenChange={setCreating}
        onSaved={(crop) => navigate(`/crop/${crop.id}/members`)}
      />
    </main>
  )
}

function CropRow({ crop }: { crop: Crop }) {
  return (
    <Link
      to={`/crop/${crop.id}`}
      className="block rounded-2xl bg-[var(--surface)] border border-[var(--hairline)] p-4 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-[var(--ink)] truncate">
          {crop.name}
        </span>
        {crop.archived ? (
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-[var(--faint)]">
            Archived
          </span>
        ) : null}
      </div>
      <p className="text-sm text-[var(--muted)] mt-0.5">{crop.season}</p>
      <p className="text-xs text-[var(--faint)] mt-1.5">
        {formatLongDate(crop.startDate)} ·{' '}
        {pluralize(crop.members.length, 'member')}
      </p>
    </Link>
  )
}
