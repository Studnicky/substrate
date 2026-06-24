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
