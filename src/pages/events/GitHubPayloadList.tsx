import { useState, type FC } from 'react'
import { useList } from '../../hooks/useResource'
import { ResourceList } from '../../components/ResourceList'
import { DetailDrawer } from '../../components/DetailDrawer'
import type { CRStatus } from '../../types'

const KIND = 'githubpayloads'

function getSubItems(item: CRStatus) {
  const spec    = item.spec as Record<string, unknown> ?? {}
  const repo    = String(spec.repository ?? '—')
  const evType  = String(spec.eventType ?? '—')
  return [
    { value: repo,   variant: 'text' as const },
    { value: evType, variant: 'tag' as const },
    { value: 'auto-generated', variant: 'text' as const },
  ]
}

export const GitHubPayloadList: FC = () => {
  const { data, loading, error } = useList(KIND)
  const [selected, setSelected] = useState<CRStatus | null>(null)

  return (
    <>
      <ResourceList
        title="github payload"
        items={data?.items ?? []}
        loading={loading}
        error={error}
        selected={selected}
        onSelect={setSelected}
        getSubItems={getSubItems}
      />
      <DetailDrawer item={selected} onClose={() => setSelected(null)} />
    </>
  )
}
