## [0.0.3] - 2026-11-01

### ⚙️ Miscellaneous Tasks

- *(finalize)* Continue when the release pull request is already merged
- Run the releaser in the release workflows
- *(ci)* Bump blanketops/environments-bots
- Sync develop with main after release/v0.0.2
- Sync develop with main
## [0.0.2] - 2026-10-21

### 🐛 Bug Fixes

- Use the verbatim Apache-2.0 license text

### 💼 Other

- Merge release/v0.0.2 into main

### 🧪 Testing

- *(server)* Drop an unused PATCH response in the round-trip test

### ⚙️ Miscellaneous Tasks

- Sync develop with main after release/v0.0.1
- *(dependabot)* Open dependency PRs against main
- Sync develop with main
- Land bot writes to main through pull requests
- Sync develop with main
- *(release)* Update changelog for v0.0.2 (#28)
## [0.0.1] - 2026-10-21

### 🚀 Features

- *(server)* Go stub HTTP server + WASM entry for all 13 CR kinds
- *(server)* Serve the built UI from KO_DATA_PATH
- *(server)* Serve every Environments kind and its events
- *(builds)* Build table with detail panel, live polling, patch and delete
- *(ui)* TailAdmin and Terminal skins, BlanketOps logo, larger dashboard type

### 🐛 Bug Fixes

- *(ui)* Drop baseUrl from tsconfig for TypeScript 7
- *(deps)* Keep Tailwind CSS on 3.x

### 💼 Other

- Split-panel live YAML preview, font consistency, phase-aware badges
- Font consistency pass, spinner, health-card progress bars
- Home page — identity hero, env empty state, resource type overview
- *(ui)* Bundle the Tabler icon font instead of loading it from jsDelivr
- Merge release/v0.0.1 into main

### 🚜 Refactor

- *(server)* Remove unused kindToGVK

### 📚 Documentation

- Write the README
- Events and debug are not wired yet
- Describe the kinds the server now serves

### 🎨 Styling

- *(server)* Gofmt wasm/main.go

### 🧪 Testing

- Fix mock data name mismatches, add store reset + predicate tests

### ⚙️ Miscellaneous Tasks

- Add netlify.toml for SPA deployment
- Add CI, security, ko image and release workflows
- Join main's initial commit into develop's history
- Stop setup-node's Actions cache; npm uses the runners' cache volume
- *(security)* Keep Trivy's vulnerability DB on the runners' cache volume
- Use the runner image's baked tools instead of per-job installs
- *(release)* Use the runner image's git-cliff instead of downloading it
- *(release)* Update changelog for v0.0.1
