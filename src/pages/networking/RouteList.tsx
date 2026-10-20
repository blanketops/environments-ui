import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'routes'

function getSubItems(item: CRStatus) {
  const spec = item.spec as Record<string, unknown> ?? {}
  const host = String(spec.host ?? '—')
  const tls  = spec.tlsEnabled ? 'TLS' : 'no-TLS'
  return [
    { value: host, variant: 'text' as const },
    { value: tls,  variant: 'tag' as const },
  ]
}

export const RouteList: FC = () => {
  const { data, loading, error, refetch } = useList(KIND)
  const [selected, setSelected] = useState<CRStatus | null>(null)

  const handleDelete = async (name: string) => {
    const { deleteResource } = await import('../../api/client')
    await deleteResource(KIND, 'tenant-a', name)
    setSelected(null)
    refetch()
  }

  return (
    <>
      <ResourceList
        title="route"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/routes/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
