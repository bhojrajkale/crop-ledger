import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { CropModal } from '../components/crops/CropModal'
import { pluralize } from '../lib/format'

const TABS = [
  { to: 'expenses', label: 'Expenses' },
  { to: 'members', label: 'People' },
  { to: 'summary', label: 'Summary' },
]

export function CropLayout() {
  const { cropId } = useParams<{ cropId: string }>()
  const navigate = useNavigate()
  const crops = useLedgerStore((s) => s.crops)
  const loading = useLedgerStore((s) => s.loading)
  const openCrop = useLedgerStore((s) => s.openCrop)
  const setArchived = useLedgerStore((s) => s.setArchived)
  const deleteCrop = useLedgerStore((s) => s.deleteCrop)

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const crop = crops.find((c) => c.id === cropId)

  useEffect(() => {
    if (cropId) void openCrop(cropId)
  }, [cropId, openCrop])

  // Wait for the initial load before deciding a crop is missing, otherwise a
  // direct link or a refresh would bounce to the list every time.
  if (loading) {
    return <p className="p-6 text-sm text-[var(--muted)]">Loading…</p>
  }

  if (!crop) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-center">
        <p className="font-semibold text-[var(--ink)]">Crop not found</p>
        <p className="text-sm text-[var(--muted)] mt-1 mb-5">
          It may have been deleted on this device.
        </p>
        <Link to="/">
          <Button variant="primary">Back to crops</Button>
        </Link>
      </main>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pr-14">
        <Link
          to="/"
          className="text-sm text-[var(--muted)] inline-block mb-2 active:scale-95 transition-transform"
        >
          ← All crops
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--ink)] truncate">
              {crop.name}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {crop.season} · {pluralize(crop.members.length, 'member')}
              {crop.archived ? ' · Archived' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            size="sm"
            onClick={() => void setArchived(crop.id, !crop.archived)}
          >
            {crop.archived ? 'Restore' : 'Archive'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </header>

      <nav
        aria-label="Crop sections"
        className="sticky top-0 z-40 mt-4 px-4 py-2 bg-[var(--surface-glass)] backdrop-blur-xl border-b border-[var(--hairline)]"
      >
        <ul className="flex gap-1">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  [
                    'block text-center min-h-10 leading-10 rounded-xl text-sm font-medium transition-transform active:scale-95',
                    isActive
                      ? 'bg-[var(--primary-tint)] text-[var(--primary)]'
                      : 'text-[var(--muted)]',
                  ].join(' ')
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="px-4 pt-4">
        <Outlet />
      </main>

      <CropModal open={editing} onOpenChange={setEditing} editCrop={crop} />

      <Modal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${crop.name}?`}
        description="This also deletes every expense recorded against it."
        footer={
          <div className="flex gap-2">
            <Button fullWidth onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={async () => {
                await deleteCrop(crop.id)
                navigate('/')
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--muted)]">
          This cannot be undone, and the data only exists on this device. If
          you might want it back, export a backup first from Backup &amp;
          restore.
        </p>
      </Modal>
    </div>
  )
}
