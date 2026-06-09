import { useState, type FC } from 'react'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export const TagInput: FC<Props> = ({ value, onChange, placeholder = 'type and press Enter' }) => {
  const [input, setInput] = useState('')

  const add = () => {
    const v = input.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setInput('')
  }

  const remove = (tag: string) => onChange(value.filter(t => t !== tag))

  return (
    <div className="tag-input-wrap"
      onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
      {value.map(tag => (
        <span key={tag} className="tag tag-blue tag-item">
          {tag}
          <button type="button" className="tag-remove" onClick={() => remove(tag)}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        placeholder={value.length === 0 ? placeholder : ''}
      />
    </div>
  )
}
