import { type FC } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null
  return (
    <div className="dialog-scrim">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h3 id="confirm-dialog-title" className="dialog-title">{title}</h3>
        <p className="dialog-msg">{message}</p>
        <div className="dialog-actions">
          <button type="button" onClick={onCancel} className="btn">No</button>
          <button type="button" onClick={onConfirm} className="btn btn-danger-solid">Yes</button>
        </div>
      </div>
    </div>
  )
}
