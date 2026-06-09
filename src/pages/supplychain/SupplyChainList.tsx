import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'supplychains'

function getSubItems(item: CRStatus) {
  const spec  = item.spec as Record<string, unknown> ?? {}
  const repo  = String(spec.repository ?? '—')
  const steps = spec.steps as Record<string, unknown> ?? {}
  const active = Object.entries(steps)
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .join(' · ') || '—'
  return [
    { value: repo,   variant: 'text' as const },
    { value: active, variant: 'tag' as const },
  ]
}

export const SupplyChainList: FC = () => {
  const { data, loading, error, refetch } = useList(KIND)
  const [selected, setSelected] = useState<CRStatus | null>(null)

  const handleDelete = async (name: string) => {
    const { deleteResource } = await import('../../api/client')
    await deleteResource(KIND, 'default', name)
    setSelected(null)
    refetch()
  }

  return (
    <>
      <ResourceList
        title="supply chain"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/supplychains/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
