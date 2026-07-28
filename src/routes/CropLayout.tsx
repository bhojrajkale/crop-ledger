import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router'
import { useLedgerStore } from '../store/useLedgerStore'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { CropModal } from '../components/crops/CropModal'
import { useT } from '../i18n'

const TABS = [
  { to: 'expenses', key: 'tabExpenses' },
  { to: 'members', key: 'tabPeople' },
  { to: 'harvest', key: 'tabHarvest' },
  { to: 'summary', key: 'tabSummary' },
] as const

export function CropLayout() {
  const { cropId } = useParams<{ cropId: string }>()
  const navigate = useNavigate()
  const t = useT()
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
    return <p className="p-6 text-sm text-[var(--muted)]">{t('loading')}</p>
  }

  if (!crop) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-center">
        <p className="font-semibold text-[var(--ink)]">{t('cropNotFound')}</p>
        <p className="text-sm text-[var(--muted)] mt-1 mb-5">
          {t('cropNotFoundBody')}
        </p>
        <Link to="/">
          <Button variant="primary">{t('backToCrops')}</Button>
        </Link>
      </main>
    )
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <header className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pr-36">
        <Link
          to="/"
          className="text-sm text-[var(--muted)] inline-block mb-2 active:scale-95 transition-transform"
        >
          {t('allCrops')}
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--ink)] truncate">
              {crop.name}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {crop.season} · {t('members', { count: crop.members.length })}
              {crop.archived ? ` · ${t('archived')}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" onClick={() => setEditing(true)}>
            {t('edit')}
          </Button>
          <Button
            size="sm"
            onClick={() => void setArchived(crop.id, !crop.archived)}
          >
            {crop.archived ? t('restore') : t('archive')}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
            {t('delete')}
          </Button>
        </div>
      </header>

      <nav
        aria-label={t('cropSections')}
        className="sticky top-0 z-40 mt-4 px-4 py-2 bg-[var(--surface-glass)] backdrop-blur-xl border-b border-[var(--hairline)]"
      >
        <ul className="flex gap-1">
          {TABS.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                className={({ isActive }) =>
                  [
                    'block text-center min-h-10 leading-10 rounded-xl text-[13px] font-medium transition-transform active:scale-95 truncate px-1',
                    isActive
                      ? 'bg-[var(--primary-tint)] text-[var(--primary)]'
                      : 'text-[var(--muted)]',
                  ].join(' ')
                }
              >
                {t(tab.key)}
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
        title={t('deleteCropTitle', { name: crop.name })}
        description={t('deleteCropDescription')}
        footer={
          <div className="flex gap-2">
            <Button fullWidth onClick={() => setConfirmDelete(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={async () => {
                await deleteCrop(crop.id)
                navigate('/')
              }}
            >
              {t('delete')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--muted)]">{t('deleteCropBody')}</p>
      </Modal>
    </div>
  )
}
