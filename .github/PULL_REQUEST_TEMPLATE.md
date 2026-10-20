## What

<!-- One or two sentences. What does this PR change? -->

## Why

<!-- The intent. Link the issue if one exists: Closes #123 -->

## Area

<!-- Mark all that apply -->

* [ ] Pages / lists (`src/pages`)
* [ ] Create forms (`src/forms`)
* [ ] Shared components, layout, styling (`src/components`, `src/index.css`)
* [ ] API client / hooks (`src/api`, `src/hooks`)
* [ ] API server (`server/`)
* [ ] CI / release tooling

## Contract

<!-- Anything a form writes or a page reads (kinds, fields, apiVersion, phases) should trace to the installed CRDs, not to the previous UI code. -->

* [ ] No change to what the UI sends to or reads from the server
* [ ] Field names, required/optional markers and enum values checked against `environments-install/config/crd`
* [ ] Server routes and payloads (`server/main.go`, `server/internal/types`) match `src/api/client.ts` and `src/types`

## Checklist

* [ ] `npx tsc --noEmit` passes
* [ ] `npm test` passes
* [ ] `npm run build` passes
* [ ] `server/`: `gofmt -l .` clean, `go build ./... && go vet ./...`, `go test ./...` pass
* [ ] Checked in the browser against a running server (state whether the controller was up)
* [ ] Commit messages follow Conventional Commits and are signed off (`git commit -s`)

## Notes for reviewer

<!-- Anything non-obvious: design trade-offs, deferred follow-ups, areas needing close attention -->
