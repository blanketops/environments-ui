import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { deleteResource } from '../../api/client'
import type { CRStatus } from '../../types'

const KIND = 'builds'

function getSubItems(item: CRStatus) {
  const spec     = item.spec as Record<string, unknown> ?? {}
  const strategy = String((spec.strategy as Record<string, unknown>)?.name ?? spec.strategy ?? '—')
  const image    = String(spec.image ?? '—').split('/').pop() ?? '—'
  return [
    { value: strategy, variant: 'tag' as const },
    { value: image,    variant: 'text' as const },
  ]
}

export const BuildList: FC = () => {
  const { data, loading, error, refetch } = useList(KIND)
  const [selected, setSelected] = useState<CRStatus | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDeleteRequest = (_name: string) => {
    if (!selected) return
    setConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selected) return
    try {
      await deleteResource(KIND, selected.namespace, selected.name)
      setSelected(null)
      refetch()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setConfirmOpen(false)
    }
  }

  const handleCancelDelete = () => {
    setConfirmOpen(false)
  }

  return (
    <>
      <ResourceList
        title="build"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/builds/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer
        item={selected}
        onClose={() => setSelected(null)}
        onDelete={handleDeleteRequest}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Build"
        message={`Are you sure you want to delete "${selected?.name ?? ''}"? This cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  )
}