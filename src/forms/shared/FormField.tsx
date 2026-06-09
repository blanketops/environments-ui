import type { FC, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}

export const Field: FC<FieldProps> = ({ label, required, hint, error, children }) => (
  <div className="form-field">
    <label className="form-label">
      {label}{required && <span className="req">*</span>}
    </label>
    {children}
    {hint && !error && <p className="form-hint">{hint}</p>}
    {error && <p className="form-error-msg">{error}</p>}
  </div>
)

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: boolean }

export const Input: FC<InputProps> = ({ error, className = '', ...props }) => (
  <input
    {...props}
    className={`form-input${error ? ' input-error' : ''}${className ? ' ' + className : ''}`}
  />
)

export const Select: FC<SelectHTMLAttributes<HTMLSelectElement>> = ({ children, className = '', ...props }) => (
  <select
    {...props}
    className={`form-input${className ? ' ' + className : ''}`}
  >
    {children}
  </select>
)
