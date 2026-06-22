<p align="center"><a href="https://studnicky.github.io/substrate/"><img src="https://raw.githubusercontent.com/Studnicky/substrate/main/docs/public/og-image.svg" alt="@studnicky/substrate — Subclass-first TypeScript primitives" width="720" /></a></p>

# @studnicky/substrate

> Subclass-first TypeScript primitives.

[![CI](https://github.com/Studnicky/substrate/actions/workflows/ci.yml/badge.svg)](https://github.com/Studnicky/substrate/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/)
[![Node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[Documentation](https://studnicky.github.io/substrate/)** · **[Releases](https://github.com/Studnicky/substrate/releases)**

A subclass-first toolkit of TypeScript primitives — retry, throttle, mutex, scheduler, clock, context, pipeline, logger, errors, json, and more. Every class is a usable primitive and an extension base via protected lifecycle hooks and an explicit FSM. The design favors extension over configuration: swap behavior by subclassing, not by passing option bags.

## Architecture

- **Subclass-first:** Every public API delegates to `protected` seams. Consumers `extend` the class and override those seams to alter behavior — no plugin registries, no option-bag escape hatches.
- **No observability in bare classes:** Telemetry seams are `protected` no-op hooks (`onRetry`, `onThrottle`, `onAcquire`, etc.). Consumers add metrics and logging by overriding those hooks; the base implementation has zero dependency on any logger or metrics backend.
- **No exported singletons:** Stateless utilities are pure-`static` classes; stateful classes are `new`-able with an explicit `transition()` FSM funnel that subclasses can intercept for state-change hooks.

## Packages

| Package | Description |
|---|---|
| [@studnicky/batch](https://studnicky.github.io/substrate/packages/batch) | Batch concurrent execution for processing items in controlled batches |
| [@studnicky/circular-buffer](https://studnicky.github.io/substrate/packages/circular-buffer) | Generic circular buffer with O(1) push and shift operations |
| [@studnicky/clock](https://studnicky.github.io/substrate/packages/clock) | Wall-clock and monotonic time primitives with injectable providers for deterministic testing |
| [@studnicky/config](https://studnicky.github.io/substrate/packages/config) | Configuration validation utilities and type guards |
| [@studnicky/context](https://studnicky.github.io/substrate/packages/context) | Per-request async context isolation using AsyncLocalStorage |
| [@studnicky/errors](https://studnicky.github.io/substrate/packages/errors) | Standardized error handling for all modules |
| [@studnicky/eslint-config](https://studnicky.github.io/substrate/packages/eslint-config) | Shared ESLint 9 flat config for @studnicky packages |
| [@studnicky/fetch](https://studnicky.github.io/substrate/packages/fetch) | Professional HTTP client with timeout, interceptors, and configured clients for Node.js |
| [@studnicky/json](https://studnicky.github.io/substrate/packages/json) | JSON/object value-tools: deep merge, clone, equal, freeze, path access, sort, patch, hash |
| [@studnicky/logger](https://studnicky.github.io/substrate/packages/logger) | Pluggable logging interface with Pino wrapper, child loggers, and metadata support for Node.js |
| [@studnicky/mutex](https://studnicky.github.io/substrate/packages/mutex) | Key-based async mutex for preventing race conditions in concurrent operations |
| [@studnicky/pipeline](https://studnicky.github.io/substrate/packages/pipeline) | Generic typed async pipeline for sequential context transforms |
| [@studnicky/retry](https://studnicky.github.io/substrate/packages/retry) | Generic async retry utility with extensible error classification |
| [@studnicky/sample-buffer](https://studnicky.github.io/substrate/packages/sample-buffer) | Fixed-capacity circular buffer for numeric samples with percentile calculation |
| [@studnicky/scheduler](https://studnicky.github.io/substrate/packages/scheduler) | Scheduler primitives — real-time (setTimeout/setInterval) and virtual (min-heap, deterministic) implementations |
| [@studnicky/throttle](https://studnicky.github.io/substrate/packages/throttle) | Generic async operation throttle with sliding window concurrency control |
| [@studnicky/timing](https://studnicky.github.io/substrate/packages/timing) | High-resolution timing tracker for collecting operation metrics |
| [@studnicky/types](https://studnicky.github.io/substrate/packages/types) | Shared zero-runtime utility types and type-guard helpers for @studnicky/substrate |

## Requirements

Node 24+.

## Install

Packages publish to GitHub Packages. Add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

Then install any package:

```sh
pnpm add @studnicky/retry
```

## Develop

```sh
git clone https://github.com/Studnicky/substrate.git
cd substrate
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm docs:dev
```

## License

MIT — see [LICENSE](LICENSE).
