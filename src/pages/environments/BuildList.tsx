import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
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

  const handleDelete = async (name: string) => {
    const { deleteResource } = await import('../../api/client')
    await deleteResource(KIND, 'dev', name)
    setSelected(null)
    refetch()
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
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
