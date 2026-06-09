import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'buildtriggers'

function getSubItems(item: CRStatus) {
  const spec      = item.spec as Record<string, unknown> ?? {}
  const source    = String(spec.source ?? 'github')
  const eventType = String(spec.eventType ?? spec.branch ?? '—')
  return [
    { value: source,    variant: 'text' as const },
    { value: eventType, variant: 'tag' as const },
  ]
}

export const BuildTriggerList: FC = () => {
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
        title="build trigger"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/buildtriggers/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
