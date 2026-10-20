import type { FC, ReactNode } from 'react'
import type { DebugInfo } from '../types'

interface Props { info: DebugInfo }

const Row: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
  <div className="kv-row">
    <span className="kv-k">{label}</span>
    <span className="kv-v">{value}</span>
  </div>
)

export const DebugPanel: FC<Props> = ({ info }) => (
  <div className="stack">
    {info.lastError && (
      <div className="alert-bad">
        <p className="info-card-label" style={{ color: 'inherit' }}>Last error</p>
        <p>{info.lastError}</p>
      </div>
    )}

    <div className="info-card">
      <p className="info-card-label">Reconcile</p>
      <Row label="Queue Depth" value={info.queueDepth === -1 ? <span className="kv-v--muted">not queued</span> : <span className="kv-v--warn">{info.queueDepth}</span>} />
      <Row label="Attempts" value={info.reconcileAttempts} />
      <Row label="Last Duration" value={`${info.lastReconcileDurationMs}ms`} />
      <Row label="Last Reconcile" value={info.lastReconcileTime} />
      <Row label="Worker Slot" value={info.workerSlot === -1 ? 'sync' : info.workerSlot} />
    </div>

    <div className="info-card">
      <p className="info-card-label">Dispatch</p>
      <Row label="Route" value={info.dispatchRoute} />
      <Row label="Mediator Chain" value={
        <span>{info.mediatorChain.map((m, i) => <span key={i} className="chip">{m}</span>)}</span>
      } />
    </div>

    <div className="info-card">
      <p className="info-card-label">Predicates</p>
      {Object.entries(info.predicates).map(([k, v]) => (
        <Row key={k} label={k} value={<span className={v ? '' : 'kv-v--bad'}>{v ? 'true' : 'false'}</span>} />
      ))}
    </div>
  </div>
)
