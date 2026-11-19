import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'
import { labelsToSubItems } from '../../types'

const KIND = 'environments'
const DEFAULT_NS = 'blanketops-environments'

function getSubItems(item: CRStatus) {
  const spec = item.spec as Record<string, unknown> ?? {}
  const contract = (spec.contract ?? spec) as Record<string, unknown>
  const envType = String(contract.environmentType ?? '—')
  const typeLabel = String((item.labels ?? {})['environments.blanketops.dev/type'] ?? '—')
  return [
    { value: envType,   variant: 'tag' as const },
    { value: typeLabel, variant: 'text' as const },
    ...labelsToSubItems(item.labels),
  ]
}

export const EnvironmentList: FC = () => {
  const { data, loading, error, refetch } = useList(KIND, DEFAULT_NS)
  const [selected, setSelected] = useState<CRStatus | null>(null)

  const handleDelete = async (name: string) => {
    const { deleteResource } = await import('../../api/client')
    await deleteResource(KIND, DEFAULT_NS, name)
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
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} onPatched={refetch} onSelectItem={(item) => setSelected(item)} />
    </>
  )
}
