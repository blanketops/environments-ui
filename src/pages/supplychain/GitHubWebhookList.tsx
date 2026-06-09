import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'githubwebhooks'

function getSubItems(item: CRStatus) {
  const spec   = item.spec as Record<string, unknown> ?? {}
  const repo   = String(spec.repository ?? '—')
  const events = Array.isArray(spec.events) ? (spec.events as string[]).join(', ') : String(spec.events ?? '—')
  return [
    { value: repo,   variant: 'text' as const },
    { value: events, variant: 'tag' as const },
  ]
}

export const GitHubWebhookList: FC = () => {
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
        title="github webhook"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/githubwebhooks/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
