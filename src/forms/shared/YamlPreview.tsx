import type { FC } from 'react'
import { toYaml } from '../../components/YamlBlock'

interface Props { value: unknown }

export const YamlPreview: FC<Props> = ({ value }) => (
  <div className="yaml-preview">
    <div className="sec-title">YAML PREVIEW</div>
    <pre className="yaml-block">{toYaml(value).trim()}</pre>
  </div>
)
