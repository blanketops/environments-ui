import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'gitrepositories'

function getSubItems(item: CRStatus) {
  const spec   = item.spec as Record<string, unknown> ?? {}
  const owner  = String((spec.repository as Record<string, unknown>)?.owner ?? '')
  const repo   = String((spec.repository as Record<string, unknown>)?.name ?? spec.url ?? '—')
  const label  = owner ? `${owner}/${repo}` : repo
  const events = (spec.webhooks as Record<string, unknown>)?.events
  const evStr  = Array.isArray(events) ? (events as string[]).join(', ') : String(spec.branch ?? '—')
  return [
    { value: label, variant: 'text' as const },
    { value: evStr, variant: 'text' as const },
  ]
}

export const GitRepositoryList: FC = () => {
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
        title="git repository"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        createPath="/gitrepositories/new"
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
    </>
  )
}
