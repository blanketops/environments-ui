import { type FC } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  /** While true the dialog shows a progress bar, swaps the confirm button for a
   *  spinner, and blocks cancel/scrim dismissal so the in-flight op isn't lost. */
  busy?: boolean
  busyMessage?: string
  confirmLabel?: string
  cancelLabel?: string
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  busy = false,
  busyMessage = 'Working…',
  confirmLabel = 'Yes',
  cancelLabel = 'No',
}) => {
  if (!open) return null
  return (
    <div className="dialog-scrim" onClick={() => { if (!busy) onCancel() }}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-labelledby="confirm-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="dialog-title">{title}</h3>
        <p className="dialog-msg">{message}</p>
        {busy && (
          <div className="tbar" style={{ marginBottom: 16 }} aria-hidden="true">
            <div className="tbar-fill tbar-fill--warn" />
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel} className="btn" disabled={busy}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="btn btn-danger-solid" disabled={busy}>
            {busy ? (<><i className="ti ti-loader-2 spin" />{busyMessage}</>) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
