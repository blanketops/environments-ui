import type { CRStatus, Condition, CREvent } from '../types'

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

const readyCond = (msg = 'Reconciled successfully'): Condition[] => [
  { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: msg, lastTransitionTime: ago(600_000) },
]
const failedCond = (msg: string): Condition[] => [
  { type: 'Ready', status: 'False', reason: 'ReconcileError', message: msg, lastTransitionTime: ago(60_000) },
]
const pendingCond = (msg: string): Condition[] => [
  { type: 'Ready', status: 'False', reason: 'Initializing', message: msg, lastTransitionTime: ago(10_000) },
]
const normalEv = (reason: string, message: string, count = 1): CREvent => ({
  type: 'Normal', reason, message, count, firstTime: ago(3600_000), lastTime: ago(30_000),
})
const warnEv = (reason: string, message: string, count = 3): CREvent => ({
  type: 'Warning', reason, message, count, firstTime: ago(600_000), lastTime: ago(60_000),
})

export const mockEnvironments: CRStatus[] = [
  {
    name: 'environment-sample', namespace: 'blanketops-environments', kind: 'environments',
    phase: 'Ready', generation: 3, labels: { env: 'dev' },
    spec: { envType: 'dev', secretStore: { name: 'blanketops-environments-aws', kind: 'ClusterSecretStore' } },
    conditions: [
      { type: 'SecretStoreReady', status: 'True', reason: 'Synced', message: 'AWS store reachable and synced', lastTransitionTime: ago(600_000) },
      { type: 'ContractSatisfied', status: 'True', reason: 'Valid', message: 'All contract fields valid', lastTransitionTime: ago(600_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'Environment reconciled', lastTransitionTime: ago(600_000) },
    ],
    events: [normalEv('ReconcileSuccess', 'Environment reconciled', 12)],
  },
  {
    name: 'dev-sandbox-001', namespace: 'blanketops-environments', kind: 'environments',
    phase: 'Running', generation: 1, labels: { env: 'dev' },
    spec: { envType: 'dev', secretStore: { name: 'blanketops-environments-gcp', kind: 'ClusterSecretStore' } },
    conditions: [
      { type: 'SecretStoreReady', status: 'True', reason: 'Synced', message: 'GCP store reachable', lastTransitionTime: ago(720_000) },
      { type: 'ContractSatisfied', status: 'False', reason: 'Waiting', message: 'Waiting for build pipeline', lastTransitionTime: ago(720_000) },
      { type: 'Ready', status: 'False', reason: 'Reconciling', message: 'Awaiting conditions', lastTransitionTime: ago(720_000) },
    ],
    events: [normalEv('Reconciling', 'Awaiting build pipeline', 3)],
  },
  {
    name: 'env-staging', namespace: 'blanketops-system', kind: 'environments',
    phase: 'Ready', generation: 2, labels: { env: 'staging' },
    spec: { envType: 'staging', secretStore: { name: 'blanketops-environments-aws', kind: 'ClusterSecretStore' } },
    conditions: readyCond('Staging environment reconciled'),
    events: [normalEv('ReconcileSuccess', 'Reconciled', 5)],
  },
]

export const mockBuilds: CRStatus[] = [
  {
    name: 'build-for-kaniko-sample', namespace: 'dev', kind: 'builds',
    phase: 'Running', generation: 2,
    spec: { image: 'docker.io/nkanyezisolutions/for-kaniko-app:main', strategy: { name: 'kaniko', kind: 'ClusterBuildStrategy' }, source: { url: 'git@github.com:ntlaletsi70/blanketops-app.git', revision: 'main', cloneSecret: 'github-ssh-credentials' }, serviceAccount: { name: 'build-bot' }, policy: { triggers: ['pull_request', 'push'], retry: { maxAttempts: 3 } } },
    conditions: [
      { type: 'ShipwrightBuildReady', status: 'True', reason: 'Emitted', message: 'Shipwright Build emitted', lastTransitionTime: ago(300_000) },
      { type: 'BuildRunStarted', status: 'True', reason: 'Started', message: 'BuildRun in progress', lastTransitionTime: ago(300_000) },
      { type: 'Ready', status: 'False', reason: 'Reconciling', message: 'Awaiting BuildRun completion', lastTransitionTime: ago(300_000) },
    ],
    events: [normalEv('BuildStarted', 'Build initiated'), normalEv('BuildRunStarted', 'BuildRun in progress')],
  },
  {
    name: 'build-for-buildah-managed-sample', namespace: 'dev', kind: 'builds',
    phase: 'Ready', generation: 3,
    spec: { image: 'docker.io/nkanyezisolutions/for-buildah-app:main', strategy: { name: 'buildah-shipwright-managed-push', kind: 'ClusterBuildStrategy' }, source: { url: 'git@github.com:ntlaletsi70/blanketops-app.git', revision: 'main', cloneSecret: 'github-ssh-credentials' }, serviceAccount: { name: 'build-bot' } },
    conditions: [
      { type: 'ShipwrightBuildReady', status: 'True', reason: 'Emitted', message: 'Shipwright Build emitted', lastTransitionTime: ago(172_800_000) },
      { type: 'BuildRunStarted', status: 'True', reason: 'Complete', message: 'BuildRun complete', lastTransitionTime: ago(172_800_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'Build reconciled', lastTransitionTime: ago(172_800_000) },
    ],
    events: [],
  },
  {
    name: 'build-for-buildpacks-sample', namespace: 'dev', kind: 'builds',
    phase: 'Ready', generation: 2,
    spec: { image: 'docker.io/nkanyezisolutions/for-buildpacks-app:main', strategy: { name: 'buildpacks-v3', kind: 'ClusterBuildStrategy' }, source: { revision: 'main', cloneSecret: 'github-ssh-credentials' }, policy: { triggers: ['pull_request', 'push'] } },
    conditions: readyCond('Build reconciled'),
    events: [],
  },
  {
    name: 'build-api', namespace: 'blanketops-system', kind: 'builds',
    phase: 'Ready', generation: 4,
    spec: { strategy: { name: 'kaniko' }, source: { contextPath: '.' }, image: 'registry.blanketops.dev/api:latest' },
    conditions: readyCond('Image pushed'),
    events: [normalEv('BuildStarted', 'Build initiated from SHA abc1234'), normalEv('BuildComplete', 'Image pushed')],
  },
  {
    name: 'build-gateway', namespace: 'blanketops-system', kind: 'builds',
    phase: 'Failed', generation: 3,
    spec: { strategy: { name: 'kaniko' }, source: { contextPath: './gateway' }, image: 'registry.blanketops.dev/gateway:latest' },
    conditions: failedCond('kaniko: COPY failed: file not found in build context'),
    events: [warnEv('BuildFailed', 'kaniko: COPY failed: file not found in build context or URL')],
  },
]

export const mockBuildTriggers: CRStatus[] = [
  {
    name: 'buildtrigger-for-kaniko-sample', namespace: 'dev', kind: 'buildtriggers',
    phase: 'Ready', generation: 2,
    spec: { source: 'github', eventType: 'push', repository: { owner: 'ntlaletsi70', name: 'blanketops-app' }, ref: 'refs/heads/main', buildRef: { name: 'build-for-kaniko-sample' }, payloadPolicy: { allow: true } },
    conditions: [
      { type: 'EventMatched', status: 'True', reason: 'Matched', message: 'GitHubEvent matches trigger criteria', lastTransitionTime: ago(259_200_000) },
      { type: 'BuildDispatched', status: 'True', reason: 'Dispatched', message: 'Build CR reconciliation triggered', lastTransitionTime: ago(259_200_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'Trigger satisfied', lastTransitionTime: ago(259_200_000) },
    ],
    events: [],
  },
  {
    name: 'trigger-api-main', namespace: 'blanketops-system', kind: 'buildtriggers',
    phase: 'Ready', generation: 2,
    spec: { source: 'github', eventType: 'push', branch: 'main', buildRef: { name: 'build-api' }, repositoryRef: 'repo-api', pauseOnFailure: true },
    conditions: readyCond('Watching branch main'),
    events: [],
  },
  {
    name: 'trigger-gateway-main', namespace: 'blanketops-system', kind: 'buildtriggers',
    phase: 'Failed', generation: 3,
    spec: { source: 'github', eventType: 'push', branch: 'main', buildRef: { name: 'build-gateway' }, repositoryRef: 'repo-platform', pauseOnFailure: true },
    conditions: failedCond('Last triggered build failed'),
    events: [warnEv('BuildFailed', 'build-gateway failed — trigger paused')],
  },
]

export const mockPackages: CRStatus[] = [
  {
    name: 'package-for-kaniko-sample', namespace: 'blanketops-environments', kind: 'packages',
    phase: 'Running', generation: 1,
    spec: { name: 'for-kaniko-app', version: 'v1.0.0', packageVersion: 'v1.2.3', maintainer: 'Neo <neo@blanketops.online>', packageRepo: 'ntlaletsi70/for-kaniko-app-packages.git', packageKappDiff: true, stateRepo: { url: 'ntlaletsi70/for-kaniko-app-state.git', ref: { branch: 'master' }, strategy: 'kustomization', path: './clusters/dev' } },
    conditions: [
      { type: 'ImageAvailable', status: 'False', reason: 'Waiting', message: 'Awaiting Build completion', lastTransitionTime: ago(300_000) },
      { type: 'PackagePublished', status: 'False', reason: 'Waiting', message: 'Awaiting image push', lastTransitionTime: ago(300_000) },
      { type: 'StateSynced', status: 'False', reason: 'Waiting', message: 'Awaiting kapp-diff reconciliation', lastTransitionTime: ago(300_000) },
      { type: 'Ready', status: 'False', reason: 'Reconciling', message: 'Awaiting conditions', lastTransitionTime: ago(300_000) },
    ],
    events: [],
  },
  {
    name: 'pkg-api-v1', namespace: 'blanketops-system', kind: 'packages',
    phase: 'Ready', generation: 2,
    spec: { strategy: 'kustomize', stateRepo: 'git@github.com:blanketops/state.git', version: 'v1.4.2' },
    conditions: readyCond('State repo synced'),
    events: [],
  },
  {
    name: 'pkg-worker-v1', namespace: 'blanketops-system', kind: 'packages',
    phase: 'Ready', generation: 1,
    spec: { strategy: 'kustomize', stateRepo: 'git@github.com:blanketops/state.git', version: 'v1.1.0' },
    conditions: readyCond(),
    events: [],
  },
]

export const mockServiceUnits: CRStatus[] = [
  {
    name: 'serviceunit-for-kaniko-web-sample', namespace: 'dev', kind: 'serviceunits',
    phase: 'Running', generation: 1,
    spec: { type: 'static', image: 'docker.io/nkanyezisolutions/for-kaniko-app:master', containerPort: 8080, size: 2, appType: 'web', stackType: 'nodejs' },
    conditions: [
      { type: 'PackageReady', status: 'False', reason: 'Waiting', message: 'Awaiting Package reconciliation', lastTransitionTime: ago(300_000) },
      { type: 'Ready', status: 'False', reason: 'Reconciling', message: 'Awaiting conditions', lastTransitionTime: ago(300_000) },
    ],
    events: [],
  },
  {
    name: 'serviceunit-for-kaniko-worker-sample', namespace: 'dev', kind: 'serviceunits',
    phase: 'Running', generation: 1,
    spec: { type: 'build', buildRef: { name: 'build-for-kaniko-sample' }, containerPort: 9000, size: 1, appType: 'worker', stackType: 'python' },
    conditions: [
      { type: 'PackageReady', status: 'False', reason: 'Waiting', message: 'Awaiting Package reconciliation', lastTransitionTime: ago(300_000) },
      { type: 'Ready', status: 'False', reason: 'Reconciling', message: 'Awaiting conditions', lastTransitionTime: ago(300_000) },
    ],
    events: [],
  },
  {
    name: 'su-api', namespace: 'blanketops-system', kind: 'serviceunits',
    phase: 'Ready', generation: 3,
    spec: { type: 'build', buildRef: { name: 'build-api' }, imageRef: 'registry.blanketops.dev/api:latest' },
    conditions: readyCond('Serving traffic'),
    events: [],
  },
  {
    name: 'su-frontend', namespace: 'blanketops-system', kind: 'serviceunits',
    phase: 'Ready', generation: 1,
    spec: { type: 'static', imageRef: 'registry.blanketops.dev/frontend:latest' },
    conditions: readyCond(),
    events: [],
  },
  {
    name: 'su-gateway', namespace: 'blanketops-system', kind: 'serviceunits',
    phase: 'Failed', generation: 2,
    spec: { type: 'build', buildRef: { name: 'build-gateway' }, imageRef: 'registry.blanketops.dev/gateway:latest' },
    conditions: failedCond('Image build failed — cannot pull'),
    events: [warnEv('ImagePullFailed', 'registry.blanketops.dev/gateway:latest not available', 4)],
  },
]

export const mockDeployments: CRStatus[] = [
  {
    name: 'deployment-for-kaniko-sample', namespace: 'dev', kind: 'deployments',
    phase: 'Ready', generation: 2,
    spec: { serviceUnits: ['for-kaniko-app-api', 'for-kaniko-app-worker'], runtime: 'kubernetes.io/container-runtime', strategy: 'Rolling', imageAutomation: false, reconciliationStrategy: 'kustomize', gitOwner: 'ntlaletsi70', manifestsRepo: { path: './overlays/dev' } },
    conditions: [
      { type: 'ManifestsRepoReady', status: 'True', reason: 'Cloned', message: 'manifestsRepo cloned successfully', lastTransitionTime: ago(172_800_000) },
      { type: 'ServiceUnitsResolved', status: 'True', reason: 'Resolved', message: 'All ServiceUnit refs resolved', lastTransitionTime: ago(172_800_000) },
      { type: 'ReconciliationReady', status: 'True', reason: 'Applied', message: 'kustomize overlay applied', lastTransitionTime: ago(172_800_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'Deployment reconciled', lastTransitionTime: ago(172_800_000) },
    ],
    events: [],
  },
  {
    name: 'deploy-production', namespace: 'blanketops-system', kind: 'deployments',
    phase: 'Ready', generation: 5,
    spec: { serviceUnits: ['su-api', 'su-worker', 'su-frontend', 'su-auth'], strategy: 'Rolling', manifestsRepo: 'git@github.com:blanketops/manifests.git' },
    conditions: readyCond('All service units healthy'),
    events: [],
  },
  {
    name: 'deploy-staging', namespace: 'blanketops-system', kind: 'deployments',
    phase: 'Pending', generation: 1,
    spec: { serviceUnits: ['su-api'], strategy: 'Rolling', manifestsRepo: 'git@github.com:blanketops/manifests.git' },
    conditions: pendingCond('su-gateway unhealthy'),
    events: [warnEv('ServiceUnitNotReady', 'Waiting for su-gateway', 2)],
  },
]

export const mockGitRepositories: CRStatus[] = [
  {
    name: 'gitrepository-for-kaniko-sample', namespace: 'blanketops-environments', kind: 'gitrepositories',
    phase: 'Ready', generation: 1,
    spec: { provider: 'github', hookUrl: 'https://elimination-propecia-meter-strips.trycloudflare.com/', repository: { owner: 'ntlaletsi70', name: 'blanketops-app' }, webhooks: { events: ['push', 'pull_request'] } },
    conditions: [
      { type: 'WebhookRegistered', status: 'True', reason: 'Registered', message: 'Crossplane registered webhook on GitHub repository', lastTransitionTime: ago(259_200_000) },
      { type: 'HookUrlReachable', status: 'True', reason: 'Reachable', message: 'cloudflared tunnel responding at hookUrl', lastTransitionTime: ago(259_200_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'GitRepository synced and webhook active', lastTransitionTime: ago(259_200_000) },
    ],
    events: [],
  },
  {
    name: 'repo-api', namespace: 'blanketops-system', kind: 'gitrepositories',
    phase: 'Ready', generation: 1,
    spec: { url: 'git@github.com:blanketops/api.git', branch: 'main', secretRef: 'git-credentials' },
    conditions: readyCond('Synced at abc1234'),
    events: [],
  },
  {
    name: 'repo-platform', namespace: 'blanketops-system', kind: 'gitrepositories',
    phase: 'Ready', generation: 1,
    spec: { url: 'git@github.com:blanketops/platform.git', branch: 'main' },
    conditions: readyCond(),
    events: [],
  },
]

export const mockGitHubEvents: CRStatus[] = [
  {
    name: 'githubevent-for-kaniko-sample', namespace: 'dev', kind: 'githubevents',
    phase: 'Ready', generation: 1,
    spec: { repository: 'ntlaletsi70/blanketops-app', eventType: 'push', ref: 'refs/heads/main', webhook: { secretRef: { name: 'github-webhook-secret', key: 'secret' } } },
    conditions: [
      { type: 'WebhookRegistered', status: 'True', reason: 'Registered', message: 'Webhook active via GitRepository', lastTransitionTime: ago(259_200_000) },
      { type: 'PayloadReceived', status: 'True', reason: 'Received', message: 'Push event parsed into GitHubPayload', lastTransitionTime: ago(259_200_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'Event processed', lastTransitionTime: ago(259_200_000) },
    ],
    events: [],
  },
  {
    name: 'ghe-api-push', namespace: 'blanketops-system', kind: 'githubevents',
    phase: 'Ready', generation: 1,
    spec: { events: ['push'], repositoryRef: 'repo-api', filters: { branches: ['main'] } },
    conditions: readyCond('Webhook registered'),
    events: [],
  },
  {
    name: 'ghe-platform-pr', namespace: 'blanketops-system', kind: 'githubevents',
    phase: 'Ready', generation: 1,
    spec: { events: ['pull_request'], repositoryRef: 'repo-platform' },
    conditions: readyCond('Webhook registered'),
    events: [],
  },
]

export const mockGitHubPayloads: CRStatus[] = [
  {
    name: 'githubpayload-abc123', namespace: 'dev', kind: 'githubpayloads',
    phase: 'Ready', generation: 1,
    spec: { repository: 'ntlaletsi70/blanketops-app', eventType: 'push', ref: 'refs/heads/main', sha: 'abc1234567890def', author: 'ntlaletsi70', message: 'feat: add kaniko build support', sourceEvent: 'githubevent-for-kaniko-sample' },
    conditions: [
      { type: 'PayloadParsed', status: 'True', reason: 'Parsed', message: 'GitHub push payload parsed and validated', lastTransitionTime: ago(300_000) },
      { type: 'BuildTriggerNotified', status: 'True', reason: 'Notified', message: 'BuildTrigger evaluated against payload', lastTransitionTime: ago(300_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'Payload processed', lastTransitionTime: ago(300_000) },
    ],
    events: [normalEv('PayloadParsed', 'Push event parsed from githubevent-for-kaniko-sample')],
  },
  {
    name: 'githubpayload-def456', namespace: 'dev', kind: 'githubpayloads',
    phase: 'Ready', generation: 1,
    spec: { repository: 'ntlaletsi70/blanketops-app', eventType: 'pull_request', ref: 'refs/pull/12/head', sha: 'def4567890abcdef', author: 'ntlaletsi70', message: 'fix: resolve build context issue', sourceEvent: 'githubevent-for-kaniko-sample' },
    conditions: readyCond('Payload processed'),
    events: [],
  },
]

export const mockRoutes: CRStatus[] = [
  {
    name: 'shopping-app-route', namespace: 'tenant-a', kind: 'routes',
    phase: 'Ready', generation: 2,
    spec: { host: 'api.dev.domain.co.za', path: '/', enabled: true, tlsEnabled: true, runtime: 'kubernetes.io/container-runtime' },
    conditions: [
      { type: 'DomainReconciled', status: 'True', reason: 'Reconciled', message: 'Domain CR reconciled', lastTransitionTime: ago(172_800_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'Route serving', lastTransitionTime: ago(172_800_000) },
    ],
    events: [],
  },
  {
    name: 'route-api-production', namespace: 'blanketops-system', kind: 'routes',
    phase: 'Ready', generation: 2,
    spec: { host: 'api.dev.blanketops.dev', path: '/api/v1', tlsEnabled: true, runtime: 'knative' },
    conditions: readyCond('Route active'),
    events: [],
  },
  {
    name: 'route-frontend-production', namespace: 'blanketops-system', kind: 'routes',
    phase: 'Ready', generation: 1,
    spec: { host: 'app.dev.blanketops.dev', path: '/', tlsEnabled: true, runtime: 'knative' },
    conditions: readyCond('Route active'),
    events: [],
  },
  {
    name: 'route-gateway', namespace: 'blanketops-system', kind: 'routes',
    phase: 'Failed', generation: 2,
    spec: { host: 'gw.dev.blanketops.dev', path: '/', tlsEnabled: true, runtime: 'knative' },
    conditions: failedCond('ServiceUnit su-gateway is not healthy'),
    events: [warnEv('BackendNotReady', 'Upstream su-gateway returning 503', 6)],
  },
]

export const mockDomains: CRStatus[] = [
  {
    name: 'shopping-app-domain', namespace: 'tenant-a', kind: 'domains',
    phase: 'Running', generation: 2,
    spec: { host: 'api.dev.domain.co.za', routeRef: { name: 'shopping-app-route' }, tlsStrategy: 'platform', mtls: { enforced: true }, renewBefore: '720h' },
    conditions: [
      { type: 'DomainClaimReady', status: 'True', reason: 'Reconciled', message: 'DomainClaim reconciled in knative-serving', lastTransitionTime: ago(172_800_000) },
      { type: 'DomainMappingReady', status: 'True', reason: 'Active', message: 'DomainMapping active', lastTransitionTime: ago(172_800_000) },
      { type: 'CertificateReady', status: 'False', reason: 'Provisioning', message: 'Wildcard cert provisioning', lastTransitionTime: ago(172_800_000) },
      { type: 'Ready', status: 'False', reason: 'Reconciling', message: 'Awaiting cert', lastTransitionTime: ago(172_800_000) },
    ],
    events: [],
  },
  {
    name: 'client-a-domain', namespace: 'tenant-b', kind: 'domains',
    phase: 'Running', generation: 1,
    spec: { host: 'app.client-a.co.za', routeRef: { name: 'client-a-route' }, tlsStrategy: 'custom', mtls: { enforced: true }, renewBefore: '720h' },
    conditions: [
      { type: 'DomainClaimReady', status: 'True', reason: 'Reconciled', message: 'DomainClaim reconciled', lastTransitionTime: ago(480_000) },
      { type: 'IssuerReady', status: 'True', reason: 'Provisioned', message: 'HTTP01 Issuer provisioned in tenant-b', lastTransitionTime: ago(480_000) },
      { type: 'CertificateReady', status: 'False', reason: 'Provisioning', message: 'HTTP01 challenge in progress', lastTransitionTime: ago(480_000) },
      { type: 'Ready', status: 'False', reason: 'Reconciling', message: 'Awaiting cert', lastTransitionTime: ago(480_000) },
    ],
    events: [],
  },
  {
    name: 'domain-blanketops-dev', namespace: 'blanketops-system', kind: 'domains',
    phase: 'Ready', generation: 2,
    spec: { host: 'blanketops.dev', tlsStrategy: 'DNS01', mtls: { enforced: true } },
    conditions: readyCond('Wildcard cert issued for *.dev.blanketops.dev'),
    events: [],
  },
]

export const mockSupplyChains: CRStatus[] = [
  {
    name: 'for-kaniko-app', namespace: 'default', kind: 'supplychains',
    phase: 'Ready', generation: 1,
    spec: { repository: 'ntlaletsi70/for-kaniko-app', webhookHost: 'pop-os.tailf8145.ts.net', image: { registry: 'docker.io', name: 'nkanyezisolutions/for-kaniko-app', tagStrategy: 'git-sha', cloneSecret: 'github-ssh-credentials', registrySecret: 'registry-credentials' }, steps: { buildpacks: true, sign: true, attest: true, sonarQube: { serverURL: 'http://sonarqube-sonarqube.default.svc.cluster.local:9000/sonarqube', projectKey: 'ntlaletsi70_for-kaniko-app' }, grafeas: { serverURL: 'http://grafeas.default.svc.cluster.local:8080' } }, signing: { fulcioURL: 'http://fulcio-server.fulcio-system.svc.cluster.local', rekorURL: 'http://rekor-server.rekor-system.svc.cluster.local' }, serviceAccountName: 'supply-chain-runner' },
    conditions: [
      { type: 'WebhookReady', status: 'True', reason: 'Registered', message: 'GitHubWebhook registered and active', lastTransitionTime: ago(259_200_000) },
      { type: 'PipelineReady', status: 'True', reason: 'Reconciled', message: 'Tekton Pipeline reconciled', lastTransitionTime: ago(259_200_000) },
      { type: 'SigningReady', status: 'True', reason: 'Reachable', message: 'Fulcio + Rekor reachable', lastTransitionTime: ago(259_200_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'SupplyChain reconciled', lastTransitionTime: ago(259_200_000) },
    ],
    events: [normalEv('PipelineRunStarted', 'Tekton PipelineRun triggered for push event')],
  },
]

export const mockGitHubWebhooks: CRStatus[] = [
  {
    name: 'for-kaniko-app-webhook', namespace: 'default', kind: 'githubwebhooks',
    phase: 'Ready', generation: 1,
    spec: { repository: 'ntlaletsi70/for-kaniko-app', supplyChainRef: { name: 'for-kaniko-app' }, hookURL: 'https://pop-os.tailf8145.ts.net', events: ['push'], contentType: 'json', insecureSSL: false, secretRef: { name: 'github-app-credentials' } },
    conditions: [
      { type: 'SupplyChainReady', status: 'True', reason: 'Ready', message: 'SupplyChain for-kaniko-app is Ready', lastTransitionTime: ago(259_200_000) },
      { type: 'WebhookRegistered', status: 'True', reason: 'Registered', message: 'Webhook registered on ntlaletsi70/for-kaniko-app via GitHub API', lastTransitionTime: ago(259_200_000) },
      { type: 'Ready', status: 'True', reason: 'ReconcileSuccess', message: 'GitHubWebhook active', lastTransitionTime: ago(259_200_000) },
    ],
    events: [],
  },
]

export const MOCK_STORE: Record<string, CRStatus[]> = {
  environments:    mockEnvironments,
  builds:          mockBuilds,
  buildtriggers:   mockBuildTriggers,
  packages:        mockPackages,
  serviceunits:    mockServiceUnits,
  deployments:     mockDeployments,
  gitrepositories: mockGitRepositories,
  githubevents:    mockGitHubEvents,
  githubpayloads:  mockGitHubPayloads,
  routes:          mockRoutes,
  domains:         mockDomains,
  supplychains:    mockSupplyChains,
  githubwebhooks:  mockGitHubWebhooks,
}

// Deep snapshot taken at module load — use resetMockStore() in beforeEach to
// prevent test mutations from leaking across test cases.
const INITIAL_SNAPSHOT: Record<string, CRStatus[]> =
  Object.fromEntries(Object.entries(MOCK_STORE).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]))

export function resetMockStore(): void {
  for (const [kind, items] of Object.entries(INITIAL_SNAPSHOT)) {
    MOCK_STORE[kind] = JSON.parse(JSON.stringify(items))
  }
}
