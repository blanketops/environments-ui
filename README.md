# BlanketOps Environments UI

A web console for BlanketOps Environments. It lists, creates, edits and
deletes the Environments custom resources in a cluster and shows their
status, conditions and Kubernetes events as the controller reconciles them.

## Status

The UI is a single-page React 18 + TypeScript application, built with Vite,
styled with Tailwind. It talks to the Kubernetes API through a generic REST
endpoint that the controller provides.

| Kind | API path | API group | Installed by |
|------|----------|-----------|--------------|
| Environment | `environments` | `environments.blanketops.dev` | environments-install |
| Build | `builds` | `environments.blanketops.dev` | environments-install |
| Package | `packages` | `environments.blanketops.dev` | environments-install |
| ServiceUnit | `serviceunits` | `environments.blanketops.dev` | environments-install |
| Deployment | `deployments` | `environments.blanketops.dev` | environments-install |
| Route | `routes` | `networks.blanketops.dev` | environments-install |
| Domain | `domains` | `networks.blanketops.dev` | environments-install |
| GitRepository | `gitrepositories` | `sources.blanketops.dev` | environments-install |
| GitHubEvent | `githubevents` | `events.blanketops.dev` | environments-install |
| SupplyChain | `supplychains` | `supplychain.blanketops.dev` | secure-software-supply-chain |
| GitHubWebhook | `githubwebhooks` | `supplychain.blanketops.dev` | secure-software-supply-chain |

All versions are `v1alpha1`. A kind whose CRD is not in the cluster answers
`404` with reason `NotInstalled`; an unknown path segment answers `400
unknown kind`. The phase shown for Build and GitHubEvent follows their
condition sequence; any other kind is Ready when every condition is True and
Failed when a condition is False with a reason ending in `Failed`,
`Rejected` or `Error`. The `debug` sub-resource is not wired and returns
placeholder values.

The UI is not part of `bops-env install` or the environments-install
manifests; it is run separately (see below).

## Security

The API has no authentication and sends `Access-Control-Allow-Origin: *`.
Anyone who can reach the port can create, change and delete resources with
the server's Kubernetes permissions, and any web page open in a browser that
can reach it can do the same. Bind it to localhost or a private network
only, never to a public address, and run it under credentials limited to
the kinds above.

## Getting started

Requirements: Node.js 24, and a kubeconfig for a cluster with the
Environments CRDs installed. The pages load without the controller running,
but nothing reconciles without it.

Run the UI from source:

```bash
npm ci
npm run build                      # writes dist/
npx vite preview                   # http://localhost:4173
```

Or run the Vite dev server with HMR:

```bash
npm run dev                        # UI on :5173
```

## Development

```bash
npm run dev                        # Vite dev server with HMR on :5173
```

| Command | What it runs |
|---------|--------------|
| `npm run build` | type check (`tsc`) and production build into `dist/` |
| `npm test` | Vitest suite (jsdom) |
| `npm run coverage` | Vitest with v8 coverage |

## Configuration

| Variable | Read by | Default | Meaning |
|----------|---------|---------|---------|
| `PORT` | Vite preview | `4173` | listen port for `vite preview` |
| `VITE_API_BASE` | UI, at build time | empty (same origin) | API base URL when the UI is hosted apart from the API |
| `KUBECONFIG` | user | unset | cluster credentials; without it, in-cluster config, then `~/.kube/config` |

## API

The UI talks to the Kubernetes API through the controller's generic REST
endpoint. The exact paths depend on the controller version, but generally:

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/api/v1/{kind}` (optional `?namespace=`) |
| POST | `/api/v1/{kind}` |
| GET | `/api/v1/{kind}/{ns}/{name}` |
| PATCH | `/api/v1/{kind}/{ns}/{name}` (merge patch) |
| DELETE | `/api/v1/{kind}/{ns}/{name}` |
| GET | `/api/v1/{kind}/{ns}/{name}/events` |
| GET | `/api/v1/{kind}/{ns}/{name}/debug` |

## Image and releases

`.github/workflows/docker.yml` builds the UI (Vite → `dist/`), builds a
container image via Kaniko (no Docker daemon needed), and pushes to GHCR:
`ghcr.io/blanketops/environments-ui`. A `v*` tag publishes `{version}` and
`latest`. The image is not signed yet.

Releases follow the family flow: `create-release.yml` (run by hand with a
version) cuts `release/<version>` from `develop`, `finalize-release.yml`
merges it into `main`, tags it, and merges `main` back into `develop`;
`release.yml` publishes the GitHub Release from the tag.

The `Dockerfile` with `nginx.conf` (static UI behind nginx) and `netlify.toml`
(static hosting; needs `VITE_API_BASE`) are alternatives to the container
image.

## Contributing

Branch from `develop` and open pull requests against it; `main` only
receives releases. Use Conventional Commits and sign off every commit
(`git commit -s`).