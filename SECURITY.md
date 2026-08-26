# Security policy

## Reporting a vulnerability

Use [GitHub's private vulnerability reporting](https://github.com/Studnicky/substrate/security/advisories/new) for any security issue. Reports are private until a fix ships.

Do not open public issues for vulnerabilities.

## Supported versions

1.x is supported. Patch releases land against the latest 1.x minor.

## Scope

In scope:

- **ReDoS** in any regex-bearing utility (predicates, config validation, path parsing).
- **Prototype pollution** in the JSON utilities (`@studnicky/json`): deep merge, clone, patch, or path-access operations that allow `__proto__`, `constructor`, or `prototype` key injection.
- **Unbounded resource growth** in scheduler, throttle, concurrency, circular-buffer, sample-buffer, or event-bus primitives: inputs that cause unbounded queue growth, heap exhaustion, or timer accumulation with no release path.
- **Mutex / concurrency deadlock** introduced by the library's own locking logic (not consumer misuse).
- **Supply chain**: compromised dependency, malicious publish, or typosquatting of a `@studnicky/*` package.

Out of scope:

- Issues in dependencies that have not yet released a fix — open the upstream issue first.
- Misuse patterns documented as anti-patterns in the docs (e.g., sharing a stateful primitive across isolation boundaries without synchronization).
- Performance degradation that requires adversarially crafted input volumes beyond reasonable production use.

## Dependency pins

`pnpm.overrides` in the root `package.json` carries exactly one entry. An override is a blunt
instrument — it applies to every resolution in the graph regardless of what a dependent
declares — so it is used only where no dependency bump reaches the fix.

### `vite: ^6.4.3`

Keep this. It is not redundant.

`vitepress` is the only dependent, it is a docs-build devDependency, and its latest stable
release (1.6.4) declares `vite: ^5.4.14`. The vite 5.x line carries
[GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) (HIGH, `server.fs.deny`
bypass) plus an open moderate path-traversal advisory, and the fix for the HIGH ships only in
6.4.3 — there is no 5.x backport. Removing this override resolves vite to 5.4.21 and reintroduces
both advisories.

The alternative — `vitepress@2.x`, the only line declaring vite 6 support — is a prerelease
(`2.0.0-alpha.19`, no beta or rc exists) and drops `vitepress-plugin-mermaid`, which
peer-requires `vitepress: ^1.0.0`.

So the override forces a vite major that vitepress does not declare. That mismatch is accepted
deliberately: vite 6.4.3 has no open advisories, and the docs build has been green on every run
since the pin landed. Revisit when a stable `vitepress` 2.x ships with a mermaid plugin that
supports it.
