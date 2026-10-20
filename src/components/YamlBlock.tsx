import type { FC } from 'react'

function toYaml(o: unknown, indent = 0): string {
  const s = '  '.repeat(indent)
  if (o === null || o === undefined) return 'null'
  if (typeof o === 'boolean') return o.toString()
  if (typeof o === 'number') return o.toString()
  if (typeof o === 'string') return o || "''"
  if (Array.isArray(o)) {
    if (!o.length) return '[]'
    return '\n' + o.map(v => `${s}- ${toYaml(v, indent + 1)}`).join('\n')
  }
  if (typeof o === 'object') {
    const entries = Object.entries(o as Record<string, unknown>).filter(([, v]) => v !== undefined)
    if (!entries.length) return '{}'
    return '\n' + entries.map(([k, v]) => {
      const val = toYaml(v, indent + 1)
      return `${s}${k}:${val.startsWith('\n') ? val : ' ' + val}`
    }).join('\n')
  }
  return String(o)
}

interface Props { value: unknown }

export const YamlBlock: FC<Props> = ({ value }) => {
  const raw = toYaml(value)
  return (
    <pre className="yaml-block">
      {raw}
    </pre>
  )
}

export { toYaml }
