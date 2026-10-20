# BlanketOps Environments UI

A web console for BlanketOps Environments. It lists, creates, edits and
deletes the Environments custom resources in a cluster and shows their
status, conditions and Kubernetes events as the controller reconciles them.

It is two parts that ship as one image:

| Part | Path | What it does |
|------|------|--------------|
| UI | `src/` | React 18 + TypeScript single-page app, built with Vite, styled with Tailwind |
| Server | `server/` | Go HTTP server: a small JSON API over the Kubernetes API, and the built UI from the same origin |

The browser only talks to the server; the server talks to the cluster with
the credentials it runs under.

## Status

The UI has pages and forms for every Environments kind (Environment, Build,
Package, ServiceUnit, Deployment, Route, Domain, GitRepository, GitHubEvent,
SupplyChain, GitHubWebhook). The server wires two of them to the cluster:

| Kind | API path | List | Get | Create | Patch | Delete |
|------|----------|------|-----|--------|-------|--------|
| Build | `builds` | yes | yes | yes | yes | yes |
| GitHubEvent | `githubevents` | yes | yes | yes | yes | yes |

Every other kind returns `400 unknown kind`, so those pages do not show
cluster data yet. The `events` and `debug` sub-resources are not wired:
`events` returns an empty list and `debug` placeholder values.

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

Requirements: Node.js 24, Go 1.26, and a kubeconfig for a cluster with the
Environments CRDs installed. The pages load without the controller running,
but nothing reconciles without it.

Run the UI and the server from source, as one process:

```bash
npm ci
npm run build                      # writes dist/
cd server
UI_DIR=../dist go run .            # http://localhost:8082
```

`GET /health` reports whether the server reached the cluster:

```json
{"connected": true, "status": "ok", "store": "kubernetes"}
```

To reach it from your other devices without exposing it publicly, put it on
your tailnet with `tailscale serve --bg 8082`.

## Development

Run the server and the Vite dev server side by side; Vite proxies `/api`
and `/health` to `localhost:8082` and reloads on every change:

```bash
cd server && go run .              # terminal 1, API on :8082
npm run dev                        # terminal 2, UI on :5173
```

| Command | What it runs |
|---------|--------------|
| `npm run build` | type check (`tsc`) and production build into `dist/` |
| `npm test` | Vitest suite (jsdom) |
| `npm run coverage` | Vitest with v8 coverage |
| `cd server && go test ./...` | server tests |

## Configuration

| Variable | Read by | Default | Meaning |
|----------|---------|---------|---------|
| `PORT` | server | `8082` | listen port |
| `UI_DIR` | server | unset | directory with the built UI (`index.html`); takes precedence over `KO_DATA_PATH` |
| `KO_DATA_PATH` | server | set by ko | the image's bundled UI |
| `KUBECONFIG` | server | unset | cluster credentials; without it, in-cluster config, then `~/.kube/config` |
| `VITE_API_BASE` | UI, at build time | empty (same origin) | API base URL when the UI is hosted apart from the server |

Without a UI directory the server serves the API only. Unknown `/api/`
paths return a JSON 404; any other path returns `index.html` so client-side
routes resolve.

## API

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

`.github/workflows/ko.yml` builds the UI, copies `dist/` into
`server/kodata`, and builds one multi-arch image (linux/amd64, linux/arm64)
with ko: `ghcr.io/blanketops/environments-ui`. A `v*` tag publishes
`{version}` and `latest`. The image is not signed yet.

Releases follow the family flow: `create-release.yml` (run by hand with a
version) cuts `release/<version>` from `develop`, `finalize-release.yml`
merges it into `main`, tags it, and merges `main` back into `develop`;
`release.yml` publishes the GitHub Release from the tag.

The `Dockerfile` with `nginx.conf` (static UI behind nginx, API proxied to a
`blanketops-server` service) and `netlify.toml` (static hosting; needs
`VITE_API_BASE`) are alternatives to the single image.

## Contributing

Branch from `develop` and open pull requests against it; `main` only
receives releases. Use Conventional Commits and sign off every commit
(`git commit -s`).
