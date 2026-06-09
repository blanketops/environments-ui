import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'domains'

function getSubItems(item: CRStatus) {
  const spec  = item.spec as Record<string, unknown> ?? {}
  const host  = String(spec.host ?? '—')
  const strat = String(spec.tlsStrategy ?? '—')
  const mtls  = (spec.mtls as Record<string, unknown>)?.enforced ? 'mTLS' : null
  return [
    { value: host,  variant: 'text' as const },
    { value: strat, variant: 'tag' as const },
    ...(mtls ? [{ value: mtls, variant: 'tag-purple' as const }] : []),
  ]
}

export const DomainList: FC = () => {
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
        title="domain"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/domains/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
