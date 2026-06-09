import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'packages'

function getSubItems(item: CRStatus) {
  const spec    = item.spec as Record<string, unknown> ?? {}
  const version = String(spec.packageVersion ?? spec.version ?? '—')
  const strat   = String((spec.stateRepo as Record<string, unknown>)?.strategy ?? spec.strategy ?? 'kustomize')
  return [
    { value: version, variant: 'tag' as const },
    { value: strat,   variant: 'text' as const },
  ]
}

export const PackageList: FC = () => {
  const { data, loading, error, refetch } = useList(KIND)
  const [selected, setSelected] = useState<CRStatus | null>(null)

  const handleDelete = async (name: string) => {
    const { deleteResource } = await import('../../api/client')
    await deleteResource(KIND, 'blanketops-environments', name)
    setSelected(null)
    refetch()
  }

  return (
    <>
      <ResourceList
        title="package"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/packages/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
