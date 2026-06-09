import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'githubevents'

function getSubItems(item: CRStatus) {
  const spec    = item.spec as Record<string, unknown> ?? {}
  const repoRef = String(spec.repository ?? spec.repositoryRef ?? '—')
  const evType  = String(spec.eventType ?? (Array.isArray(spec.events) ? (spec.events as string[])[0] : '—'))
  return [
    { value: repoRef, variant: 'text' as const },
    { value: evType,  variant: 'tag' as const },
  ]
}

export const GitHubEventList: FC = () => {
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
        title="github event"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/githubevents/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
