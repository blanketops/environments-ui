import { useState, type FC } from 'react'
import { Field, Input, Select } from '../forms/shared/FormField'

interface CLICommand {
  command: string
  args: string[]
  env?: Record<string, string>
  timeout?: number
}

interface CLIResponse {
  success: boolean
  output: string
  error: string
  exitCode: number
  duration: string
  command: string
}

interface CommandDef {
  label: string
  icon: string
  command: string
  args: string[]
  description: string
  color: string
  bg: string
}

interface SecretField {
  key: string
  label: string
  placeholder: string
  required: boolean
}

interface SecretProvider {
  id: string
  icon: string
  label: string
  color: string
  bg: string
  bootstrapFields: SecretField[]
  verifyFields: SecretField[]
}

interface CommandGroup {
  title: string
  commands?: CommandDef[]
  depNames?: string[]
  providers?: SecretProvider[]
}

const COMMAND_GROUPS: Record<string, CommandGroup & { icon: string; color: string; bg: string; description: string }> = {
  operator: {
    title: 'OPERATOR',
    icon: 'ti-cube',
    color: 'var(--blue)',
    bg: 'var(--blue-bg)',
    description: 'Install/uninstall the BlanketOps Environments operator (CRDs, RBAC, controller-manager)',
    commands: [
      { label: 'Install Operator', icon: 'ti-server-plus', command: 'install', args: [], description: 'Install the BlanketOps Environments operator (CRDs, RBAC, controller)', color: 'var(--blue)', bg: 'var(--blue-bg)' },
      { label: 'Uninstall Operator', icon: 'ti-server-off', command: 'uninstall', args: [], description: 'Remove the BlanketOps Environments operator', color: 'var(--red)', bg: 'var(--red-bg)' },
    ],
  },
  self: {
    title: 'CLI BINARY',
    icon: 'ti-terminal',
    color: 'var(--purple)',
    bg: 'var(--purple-bg)',
    description: 'Manage the bops-env CLI binary itself (self-upgrade, removal)',
    commands: [
      { label: 'Self Install', icon: 'ti-download', command: 'self', args: ['install'], description: 'Fetch and install the latest bops-env CLI binary', color: 'var(--green)', bg: 'var(--green-bg)' },
      { label: 'Self Uninstall', icon: 'ti-trash', command: 'self', args: ['uninstall'], description: 'Remove a self-installed bops-env CLI binary', color: 'var(--amber)', bg: 'var(--amber-bg)' },
    ],
  },
  dependencies: {
    title: 'DEPENDENCIES',
    icon: 'ti-box-multiple',
    color: 'var(--green)',
    bg: 'var(--green-bg)',
    description: 'Manage platform stack: Carvel, Argo Events, Tekton, Shipwright, Crossplane, Flux, Knative, etc.',
    commands: [
      { label: 'List All', icon: 'ti-list', command: 'dependencies', args: ['list'], description: 'List all individually addressable dependencies', color: 'var(--blue)', bg: 'var(--blue-bg)' },
      { label: 'Install All', icon: 'ti-package', command: 'dependencies', args: ['install'], description: 'Install the full platform stack', color: 'var(--green)', bg: 'var(--green-bg)' },
      { label: 'Install One', icon: 'ti-package-export', command: 'dependencies', args: ['install', ''], description: 'Install a specific dependency (enter name below)', color: 'var(--green)', bg: 'var(--green-bg)' },
      { label: 'Uninstall All', icon: 'ti-package-off', command: 'dependencies', args: ['uninstall'], description: 'Remove the full platform stack', color: 'var(--red)', bg: 'var(--red-bg)' },
      { label: 'Uninstall One', icon: 'ti-package-import', command: 'dependencies', args: ['uninstall', ''], description: 'Uninstall a specific dependency (enter name below)', color: 'var(--red)', bg: 'var(--red-bg)' },
      { label: 'Status All', icon: 'ti-report', command: 'dependencies', args: ['status'], description: 'Show install status for all dependencies', color: 'var(--purple)', bg: 'var(--purple-bg)' },
      { label: 'Status One', icon: 'ti-file-analytics', command: 'dependencies', args: ['status', ''], description: 'Show status for a specific dependency (enter name below)', color: 'var(--purple)', bg: 'var(--purple-bg)' },
    ],
    depNames: [
      'carvel', 'argoevents', 'tekton', 'tekton-dashboard', 'shipwright',
      'crossplane', 'crossplane-provider', 'externalsecrets', 'vault',
      'flux', 'flux-crds', 'flux-ui', 'buildpacks', 'kaniko', 'buildah',
      'knative', 'kourier', 'knative-kourier-setup',
    ],
  },
  cluster: {
    title: 'KIND CLUSTERS',
    icon: 'ti-devices',
    color: 'var(--amber)',
    bg: 'var(--amber-bg)',
    description: 'Manage local kind clusters for development',
    commands: [
      { label: 'Cluster Up', icon: 'ti-server', command: 'cluster', args: ['up', ''], description: 'Create the named kind cluster (enter name below)', color: 'var(--blue)', bg: 'var(--blue-bg)' },
      { label: 'Cluster Down', icon: 'ti-server-off', command: 'cluster', args: ['down', ''], description: 'Delete the named kind cluster (enter name below)', color: 'var(--red)', bg: 'var(--red-bg)' },
      { label: 'Cluster Status', icon: 'ti-server-check', command: 'cluster', args: ['status', ''], description: 'Show whether the named kind cluster exists (enter name below)', color: 'var(--green)', bg: 'var(--green-bg)' },
    ],
  },
  secrets: {
    title: 'SECRETS',
    icon: 'ti-lock',
    color: 'var(--red)',
    bg: 'var(--red-bg)',
    description: 'Bootstrap/verify BlanketOps secrets in external secret stores',
    providers: [
      { id: 'aws', icon: 'ti-brand-aws', label: 'AWS Secrets Manager', color: 'var(--amber)', bg: 'var(--amber-bg)',
        bootstrapFields: [
          { key: 'region', label: 'Region', placeholder: 'us-east-1', required: true },
          { key: 'pathPrefix', label: 'Path Prefix (optional)', placeholder: '/blanketops', required: false },
        ],
        verifyFields: [
          { key: 'region', label: 'Region', placeholder: 'us-east-1', required: true },
          { key: 'pathPrefix', label: 'Path Prefix (optional)', placeholder: '/blanketops', required: false },
        ],
      },
      { id: 'azure', icon: 'ti-brand-azure', label: 'Azure Key Vault', color: 'var(--blue)', bg: 'var(--blue-bg)',
        bootstrapFields: [
          { key: 'vaultUrl', label: 'Vault URL', placeholder: 'https://myvault.vault.azure.net', required: true },
        ],
        verifyFields: [
          { key: 'vaultUrl', label: 'Vault URL', placeholder: 'https://myvault.vault.azure.net', required: true },
        ],
      },
      { id: 'gcp', icon: 'ti-cloud', label: 'GCP Secret Manager', color: 'var(--green)', bg: 'var(--green-bg)',
        bootstrapFields: [
          { key: 'projectId', label: 'Project ID', placeholder: 'my-gcp-project', required: true },
        ],
        verifyFields: [
          { key: 'projectId', label: 'Project ID', placeholder: 'my-gcp-project', required: true },
        ],
      },
      { id: 'vault', icon: 'ti-vault', label: 'HashiCorp Vault (KV v2)', color: 'var(--purple)', bg: 'var(--purple-bg)',
        bootstrapFields: [
          { key: 'addr', label: 'Vault Address', placeholder: 'http://vault:8200', required: true },
          { key: 'token', label: 'Token', placeholder: 'root', required: true },
          { key: 'mount', label: 'Mount Path (optional)', placeholder: 'secret', required: false },
        ],
        verifyFields: [
          { key: 'addr', label: 'Vault Address', placeholder: 'http://vault:8200', required: true },
          { key: 'mount', label: 'Mount Path (optional)', placeholder: 'secret', required: false },
        ],
      },
    ],
  },
  report: {
    title: 'ALLURE REPORTING',
    icon: 'ti-chart-bar',
    color: 'var(--purple)',
    bg: 'var(--purple-bg)',
    description: 'Send test/benchmark results to Allure server',
    commands: [
      { label: 'Send Report', icon: 'ti-send', command: 'report', args: ['--file', ''], description: 'Send test results to Allure (enter file path)', color: 'var(--blue)', bg: 'var(--blue-bg)' },
      { label: 'Start Report Server', icon: 'ti-server', command: 'report-server', args: ['--port', '8080'], description: 'Start report receiver server on port 8080', color: 'var(--green)', bg: 'var(--green-bg)' },
    ],
  },
}

export const CLIPage: FC = () => {
  const [output, setOutput] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [extraArg, setExtraArg] = useState<string>('')
  const [extraArg2, setExtraArg2] = useState<string>('')
  const [extraArg3, setExtraArg3] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<string>('operator')

  // Secrets form state
  const [secretsAction, setSecretsAction] = useState<'bootstrap' | 'verify'>('bootstrap')
  const [secretsProvider, setSecretsProvider] = useState<string>('aws')
  const [secretsFields, setSecretsFields] = useState<Record<string, string>>({})

  const executeCommand = async (cmd: CLICommand) => {
    setRunning(true)
    setOutput('$ bops-env ' + [cmd.command, ...cmd.args].join(' ') + '\n\n')

    try {
      const res = await fetch('/api/v1/cli/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd),
      })
      const data: CLIResponse = await res.json()
      setOutput(prev => prev + data.output + '\n\n')
      if (!data.success && data.error) {
        setOutput(prev => prev + `Error (exit ${data.exitCode}): ${data.error}\n`)
      }
      setOutput(prev => prev + `\n✓ Completed in ${data.duration} (exit ${data.exitCode})\n`)
    } catch (err) {
      setOutput(prev => prev + `Request failed: ${err}\n`)
    } finally {
      setRunning(false)
    }
  }

  const handleQuickExec = (command: string, args: string[]) => {
    const finalArgs = args.map(arg => {
      if (arg === '') return extraArg
      if (arg === 'extra2') return extraArg2
      if (arg === 'extra3') return extraArg3
      return arg
    }).filter(Boolean)
    executeCommand({ command, args: finalArgs })
  }

  // Secrets form handler
  const handleSecretsExec = () => {
    const provider = group.providers?.find(p => p.id === secretsProvider)
    if (!provider) return

    const fields = secretsAction === 'bootstrap' ? provider.bootstrapFields : provider.verifyFields
    const args = ['secrets', secretsAction, secretsProvider]

    // Add field values in order
    for (const field of fields) {
      const value = secretsFields[field.key]
      if (value || field.required) {
        args.push(value || '')
      }
    }

    // Add flags
    const dryRun = secretsFields['dryRun'] === 'true'
    const skipConfirm = secretsFields['skipConfirm'] === 'true'
    if (dryRun) args.push('--dry-run')
    if (skipConfirm) args.push('-y')

    executeCommand({ command: 'secrets', args })
  }

  const group = COMMAND_GROUPS[selectedGroup]

    return (
      <div className="form-page">
        <div className="card">
          <div className="card-hdr">
            <span className="card-title">CLI Management</span>
            <span className="kind-badge">bops-env</span>
          </div>
          <div className="form-split">
            <form className="form-body">
              <div className="form-sec"><span className="form-sec-title">COMMAND GROUP</span><div className="form-sec-line" /></div>
                          <div className="qa-grid" style={{ marginBottom: 16 }}>
                            {Object.entries(COMMAND_GROUPS).map(([key, g]) => (
                              <button
                                key={key}
                                type="button"
                                className="qa-card"
                                onClick={() => { setSelectedGroup(key); setOutput('') }}
                                style={{ borderColor: selectedGroup === key ? g.color : 'var(--border)', background: selectedGroup === key ? g.bg : 'var(--bg1)', cursor: 'pointer' }}
                              >
                                <div className="qa-icon" style={{ background: g.bg, color: g.color }}>
                                  <i className={`ti ${g.icon}`} />
                                </div>
                                <div>
                                  <div className="qa-label" style={{ color: selectedGroup === key ? g.color : 'var(--text)' }}>{g.title}</div>
                                  <div className="qa-sub">{g.description}</div>
                                </div>
                              </button>
                            ))}
                          </div>

                          <div className="form-sec" style={{ marginTop: 16 }}><span className="form-sec-title">{group.title}</span><div className="form-sec-line" /></div>

              {selectedGroup === 'secrets' && group.providers ? (
                // Secrets dynamic form
                <>
                  <div className="form-sec" style={{ marginBottom: 16 }}><span className="form-sec-title">ACTION</span><div className="form-sec-line" /></div>
                  <div className="opt-grid opt-grid-2">
                    <button
                      type="button"
                      className={`opt-btn ${secretsAction === 'bootstrap' ? 'opt-selected' : ''}`}
                      onClick={() => { setSecretsAction('bootstrap'); setSecretsFields({}) }}
                    >
                      <span className="opt-btn-label">Bootstrap</span>
                      <span className="opt-btn-sub">Create all required secrets</span>
                    </button>
                    <button
                      type="button"
                      className={`opt-btn ${secretsAction === 'verify' ? 'opt-selected' : ''}`}
                      onClick={() => { setSecretsAction('verify'); setSecretsFields({}) }}
                    >
                      <span className="opt-btn-label">Verify</span>
                      <span className="opt-btn-sub">Check existing secrets</span>
                    </button>
                  </div>

                  <div className="form-sec" style={{ marginTop: 16, marginBottom: 16 }}><span className="form-sec-title">PROVIDER</span><div className="form-sec-line" /></div>
                  <div className="qa-grid">
                    {group.providers.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="qa-card"
                        onClick={() => { setSecretsProvider(p.id); setSecretsFields({}) }}
                        style={{ borderColor: secretsProvider === p.id ? p.color : 'var(--border)', background: secretsProvider === p.id ? p.bg : 'var(--bg1)', cursor: 'pointer' }}
                      >
                        <div className="qa-icon" style={{ background: p.bg, color: p.color }}>
                          <i className={`ti ${p.icon}`} />
                        </div>
                        <div>
                          <div className="qa-label" style={{ color: secretsProvider === p.id ? p.color : 'var(--text)' }}>{p.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="form-sec" style={{ marginTop: 16 }}><span className="form-sec-title">ARGUMENTS</span><div className="form-sec-line" /></div>
                  {(() => {
                    const provider = group.providers.find(p => p.id === secretsProvider)
                    if (!provider) return null
                    const fields = secretsAction === 'bootstrap' ? provider.bootstrapFields : provider.verifyFields
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                        {fields.map((field, fIdx) => (
                          <div key={fIdx} style={{ flex: 1, minWidth: 200 }}>
                            <Field label={field.label} required={field.required}>
                              <Input
                                value={secretsFields[field.key] || ''}
                                onChange={e => setSecretsFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                              />
                            </Field>
                          </div>
                        ))}
                        {secretsProvider === 'vault' && secretsAction === 'bootstrap' && (
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <Field label="dry-run">
                              <Select
                                value={secretsFields['dryRun'] || 'false'}
                                onChange={e => setSecretsFields(prev => ({ ...prev, dryRun: e.target.value }))}
                              >
                                <option value="false">false</option>
                                <option value="true">true</option>
                              </Select>
                            </Field>
                          </div>
                        )}
                        {secretsProvider === 'vault' && secretsAction === 'bootstrap' && (
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <Field label="skip confirmation (-y)">
                              <Select
                                value={secretsFields['skipConfirm'] || 'false'}
                                onChange={e => setSecretsFields(prev => ({ ...prev, skipConfirm: e.target.value }))}
                              >
                                <option value="false">false</option>
                                <option value="true">true</option>
                              </Select>
                            </Field>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div className="form-footer" style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSecretsExec}
                      disabled={running}
                    >
                      {running ? 'running…' : `${secretsAction.charAt(0).toUpperCase() + secretsAction.slice(1)} ${secretsProvider}`}
                    </button>
                  </div>
                </>
              ) : (
                // Regular command cards
                <div className="qa-grid" style={{ marginBottom: 16 }}>
                  {group.commands?.map((cmd, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="qa-card"
                      onClick={() => handleQuickExec(cmd.command, cmd.args)}
                      disabled={running}
                      style={{ borderColor: cmd.color, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1 }}
                    >
                      <div className="qa-icon" style={{ background: cmd.bg, color: cmd.color }}>
                        <i className={`ti ${cmd.icon}`} />
                      </div>
                      <div>
                        <div className="qa-label" style={{ color: cmd.color }}>{cmd.label}</div>
                        <div className="qa-sub">{cmd.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {group.commands?.some(cmd => cmd.args.some(a => a === '')) && (
                <div className="form-sec" style={{ marginTop: 16 }}><span className="form-sec-title">ARGUMENTS</span><div className="form-sec-line" /></div>
              )}

              {group.commands && group.commands.map((cmd, idx) => (
                cmd.args.some(a => a === '') && (
                  <div key={idx} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="opt-btn-label" style={{ color: cmd.color }}>{cmd.label}</span>
                      {cmd.args.map((arg, argIdx) => arg === '' && (
                        <div key={argIdx} style={{ flex: 1, minWidth: 200 }}>
                          <Field label={`arg ${argIdx + 1}`}>
                            <Input
                              value={argIdx === 0 ? extraArg : argIdx === 1 ? extraArg2 : extraArg3}
                              onChange={e => {
                                if (argIdx === 0) setExtraArg(e.target.value)
                                else if (argIdx === 1) setExtraArg2(e.target.value)
                                else setExtraArg3(e.target.value)
                              }}
                              placeholder={argIdx === 0 ? 'dependency name / cluster name / region / vault addr' :
                                           argIdx === 1 ? 'token / mount / project ID' : 'mount / path prefix'}
                            />
                          </Field>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}

              <div className="form-sec" style={{ marginTop: 16 }}><span className="form-sec-title">CUSTOM COMMAND</span><div className="form-sec-line" /></div>
              <Field label="command group" required>
                <Select
                  value={selectedGroup}
                  onChange={e => setSelectedGroup(e.target.value)}
                >
                  {Object.entries(COMMAND_GROUPS).map(([key]) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </Select>
              </Field>
              <Field label="subcommand + args" hint="e.g. dependencies install tekton">
                <Input
                  value={extraArg}
                  onChange={e => setExtraArg(e.target.value)}
                  placeholder="dependencies install tekton"
                />
              </Field>
              <div className="form-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const parts = extraArg.trim().split(/\\s+/)
                    if (parts.length >= 1) {
                      executeCommand({ command: parts[0], args: parts.slice(1) })
                    }
                  }}
                  disabled={running || !extraArg.trim()}
                >
                  {running ? 'running…' : 'execute'}
                </button>
                <button type="button" className="btn" onClick={() => setOutput('')}>clear output</button>
              </div>
            </form>

            <div className="form-yaml-panel">
              <div className="copy-btn">
                <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(output)}>
                  <i className="ti ti-copy" /> copy output
                </button>
              </div>
              <pre className="yaml-block" style={{ maxHeight: 'calc(100vh - 200px)', fontSize: 11 }}>{output || 'Output will appear here…'}</pre>
            </div>
          </div>
        </div>
      </div>
    )
  }