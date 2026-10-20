import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'environments'

function getSubItems(item: CRStatus) {
  const spec = item.spec as Record<string, unknown> ?? {}
  const envType    = String(spec.envType ?? (spec.contract as Record<string, unknown>)?.envType ?? '—')
  const contract   = spec.contract as Record<string, unknown> ?? {}
  const ss         = (spec.secretStore ?? contract.secretStore) as Record<string, unknown> | undefined
  const storeName  = String(ss?.name ?? '—')
  return [
    { value: envType,   variant: 'tag' as const },
    { value: storeName, variant: 'text' as const },
  ]
}

export const EnvironmentList: FC = () => {
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
        title="environment"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/environments/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
