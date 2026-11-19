import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'
import { labelsToSubItems } from '../../types'

const KIND = 'builds'
const DEFAULT_NS = 'blanketops-environments'

function getContract(item: CRStatus) {
  const spec = item.spec as Record<string, unknown> ?? {}
  return (spec.contract ?? spec) as Record<string, unknown>
}

function getSubItems(item: CRStatus) {
  const c = getContract(item)
  const strategy = String((c.strategy as Record<string, unknown>)?.name ?? c.strategy ?? '—')
  const phase = String(item.phase ?? '—')
  return [
    { value: strategy, variant: 'tag' as const },
    { value: phase, variant: 'text' as const },
    ...labelsToSubItems(item.labels),
  ]
}

export const BuildList: FC = () => {
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
        title="build"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/builds/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} onPatched={refetch} onSelectItem={(item) => setSelected(item)} />
    </>
  )
}
