import type { FC } from 'react'
import type { DebugInfo } from '../types'

interface Props { info: DebugInfo }

const Row: FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-3 py-2 border-b border-zinc-800 last:border-0">
    <span className="text-[11px] text-zinc-500 w-44 flex-shrink-0">{label}</span>
    <span className="text-[11px] text-zinc-300 font-mono break-all">{value}</span>
  </div>
)

export const DebugPanel: FC<Props> = ({ info }) => (
  <div className="space-y-4">
    {info.lastError && (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
        <p className="text-[10px] text-red-400 font-mono font-semibold mb-1">LAST ERROR</p>
        <p className="text-xs text-red-300">{info.lastError}</p>
      </div>
    )}

    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-3">Reconcile</p>
      <Row label="Queue Depth" value={info.queueDepth === -1 ? <span className="text-zinc-500">not queued</span> : <span className="text-amber-400">{info.queueDepth}</span>} />
      <Row label="Attempts" value={info.reconcileAttempts} />
      <Row label="Last Duration" value={`${info.lastReconcileDurationMs}ms`} />
      <Row label="Last Reconcile" value={info.lastReconcileTime} />
      <Row label="Worker Slot" value={info.workerSlot === -1 ? 'sync' : info.workerSlot} />
    </div>

    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-3">Dispatch</p>
      <Row label="Route" value={info.dispatchRoute} />
      <Row label="Mediator Chain" value={
        <div className="flex flex-wrap gap-1">
          {info.mediatorChain.map((m, i) => (
            <span key={i} className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-zinc-300">{m}</span>
          ))}
        </div>
      } />
    </div>

    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-3">Predicates</p>
      {Object.entries(info.predicates).map(([k, v]) => (
        <Row key={k} label={k} value={
          <span className={v ? 'text-lime-400' : 'text-red-400'}>{v ? 'true' : 'false'}</span>
        } />
      ))}
    </div>
  </div>
)
