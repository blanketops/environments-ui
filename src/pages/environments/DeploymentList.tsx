import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'deployments'

function getSubItems(item: CRStatus) {
  const spec   = item.spec as Record<string, unknown> ?? {}
  const strat  = String(spec.strategy ?? '—')
  const recon  = String(spec.reconciliationStrategy ?? 'kustomize')
  return [
    { value: strat, variant: 'tag' as const },
    { value: recon, variant: 'text' as const },
  ]
}

export const DeploymentList: FC = () => {
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
        title="deployment"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/deployments/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
