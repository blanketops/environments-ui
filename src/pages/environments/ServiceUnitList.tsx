import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'serviceunits'

function getSubItems(item: CRStatus) {
  const spec     = item.spec as Record<string, unknown> ?? {}
  const type     = String(spec.type ?? '—')
  const appType  = String(spec.appType ?? '')
  const stackType = String(spec.stackType ?? '')
  const desc     = [appType, stackType].filter(Boolean).join(' · ') || '—'
  return [
    { value: type, variant: 'tag' as const },
    { value: desc, variant: 'text' as const },
  ]
}

export const ServiceUnitList: FC = () => {
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
        title="service unit"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/serviceunits/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
