<p align="center"><a href="https://studnicky.github.io/substrate/"><img src="https://raw.githubusercontent.com/Studnicky/substrate/main/docs/public/og-image.png" alt="@studnicky/substrate: subclass-first TypeScript primitives — retry, throttle, mutex, scheduler, clock, pipeline, and more, each a usable class and an extension base" width="1200" /></a></p>

# @studnicky/substrate

> Subclass-first TypeScript primitives.

[![CI](https://github.com/Studnicky/substrate/actions/workflows/ci.yml/badge.svg)](https://github.com/Studnicky/substrate/actions/workflows/ci.yml)
[![docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/)
[![node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](package.json)
[![release](https://img.shields.io/github/v/release/Studnicky/substrate?display_name=tag&color=14b8a6)](https://github.com/Studnicky/substrate/releases)

**[Documentation](https://studnicky.github.io/substrate/)** · **[Releases](https://github.com/Studnicky/substrate/releases)**

A subclass-first toolkit of TypeScript primitives — retry, throttle, mutex, scheduler, clock, context, pipeline, logger, errors, json, and more. Every class is a usable primitive and an extension base via protected lifecycle hooks and an explicit FSM. The design favors extension over configuration: swap behavior by subclassing, not by passing option bags.

## Architecture

- **Subclass-first:** Every public API delegates to documented `protected` seams. Some seams are passive observer hooks; some are in-band behavioral hooks that transform, classify, or intercept the operation itself.
- **No observability in bare classes:** Telemetry seams are `protected` no-op hooks (`onRetry`, `onThrottle`, `onAcquire`, etc.). Consumers add metrics and logging by overriding those hooks; the base implementation has zero dependency on any logger or metrics backend. Observer hooks stay observational. Behavioral hooks remain in-band and are documented per package.
- **No exported singletons:** Stateless utilities are pure-`static` classes; stateful classes are `new`-able with an explicit `transition()` FSM funnel that subclasses can intercept for state-change hooks.

## Packages

| Package | Description |
|---|---|
| [@studnicky/batch](https://studnicky.github.io/substrate/packages/batch) | Batch concurrent execution for processing items in controlled batches |
| [@studnicky/boundary-kit](https://studnicky.github.io/substrate/packages/boundary-kit) | Boundary Kit — composes @studnicky/throttle, /resilience, and /retry into a fixed-order boundary call pattern |
| [@studnicky/bounded-dispatcher](https://studnicky.github.io/substrate/packages/bounded-dispatcher) | Bounded work dispatch pattern composing @studnicky/concurrency's Semaphore, /event-bus, and /scheduler |
| [@studnicky/cache](https://studnicky.github.io/substrate/packages/cache) | LRU cache with optional TTL and capacity bounds |
| [@studnicky/circular-buffer](https://studnicky.github.io/substrate/packages/circular-buffer) | Generic circular buffer with O(1) push and shift operations |
| [@studnicky/clock](https://studnicky.github.io/substrate/packages/clock) | Wall-clock and monotonic time primitives with injectable providers for deterministic testing |
| [@studnicky/concurrency](https://studnicky.github.io/substrate/packages/concurrency) | Keyed async channels, semaphore, and coalesce primitives |
| [@studnicky/config](https://studnicky.github.io/substrate/packages/config) | Configuration validation and clamping utilities and type guards |
| [@studnicky/context](https://studnicky.github.io/substrate/packages/context) | Per-request async context isolation using AsyncLocalStorage |
| [@studnicky/entity-store](https://studnicky.github.io/substrate/packages/entity-store) | Normalized, ID-indexed entity collection with CRUD operations and O(1) lookup |
| [@studnicky/errors](https://studnicky.github.io/substrate/packages/errors) | Standardized error handling for all modules |
| [@studnicky/eslint-config](https://studnicky.github.io/substrate/packages/eslint-config) | Shared ESLint flat config for @studnicky packages |
| [@studnicky/event-bus](https://studnicky.github.io/substrate/packages/event-bus) | Publish/subscribe event bus with backpressure-aware queues |
| [@studnicky/fetch](https://studnicky.github.io/substrate/packages/fetch) | Professional HTTP client with timeout, interceptors, and configured clients for Node.js |
| [@studnicky/file-lock](https://studnicky.github.io/substrate/packages/file-lock) | Process-level advisory file locking |
| [@studnicky/flag-evaluator](https://studnicky.github.io/substrate/packages/flag-evaluator) | Local deterministic feature-flag evaluation with percentage rollout and observability hooks |
| [@studnicky/fsm](https://studnicky.github.io/substrate/packages/fsm) | Abstract finite state machine base class with effect interpreter |
| [@studnicky/health-registry](https://studnicky.github.io/substrate/packages/health-registry) | Named async health-check registry with worst-status-wins aggregation |
| [@studnicky/idempotency-guard](https://studnicky.github.io/substrate/packages/idempotency-guard) | Idempotency key guard composing cache, concurrency, and json: dedupes concurrent calls, replays cached results within a TTL window, rejects key reuse with a different payload |
| [@studnicky/json](https://studnicky.github.io/substrate/packages/json) | JSON/object value-tools: deep merge, clone, equal, freeze, path access, sort, patch, hash |
| [@studnicky/keyed-rate-limiter](https://studnicky.github.io/substrate/packages/keyed-rate-limiter) | Per-key rate limiting composing cache and resilience: lazily creates one rate-limiting strategy per key, evicting idle keys via LRU+TTL |
| [@studnicky/keyed-work-gate](https://studnicky.github.io/substrate/packages/keyed-work-gate) | Keyed single-flight and serialized work gate composing @studnicky/mutex and @studnicky/concurrency's Coalesce |
| [@studnicky/logger](https://studnicky.github.io/substrate/packages/logger) | Pluggable logging interface with Pino wrapper, child loggers, and metadata support for Node.js |
| [@studnicky/memoize](https://studnicky.github.io/substrate/packages/memoize) | Pure function memoization composing cache and concurrency: LRU+TTL result caching keyed by a caller-supplied key derivation, with in-flight call dedup |
| [@studnicky/mutex](https://studnicky.github.io/substrate/packages/mutex) | Key-based async mutex for preventing race conditions in concurrent operations |
| [@studnicky/paginator](https://studnicky.github.io/substrate/packages/paginator) | Cursor/page-list state tracker for paginated data sources |
| [@studnicky/pipeline](https://studnicky.github.io/substrate/packages/pipeline) | Generic typed async pipeline for sequential context transforms |
| [@studnicky/predicates](https://studnicky.github.io/substrate/packages/predicates) | Type-safe predicates and coercion utilities |
| [@studnicky/process-kit](https://studnicky.github.io/substrate/packages/process-kit) | Reducer-with-effects process pattern composing @studnicky/fsm, /scheduler, and /signal |
| [@studnicky/request-executor](https://studnicky.github.io/substrate/packages/request-executor) | One-shot request execution pattern composing @studnicky/fetch, /retry, /signal, /timing, and /context |
| [@studnicky/resilience](https://studnicky.github.io/substrate/packages/resilience) | Circuit breaker, token bucket, and dead-letter queue primitives |
| [@studnicky/retry](https://studnicky.github.io/substrate/packages/retry) | Generic async retry utility with extensible error classification |
| [@studnicky/sample-buffer](https://studnicky.github.io/substrate/packages/sample-buffer) | Fixed-capacity circular buffer for numeric samples with percentile calculation |
| [@studnicky/scheduler](https://studnicky.github.io/substrate/packages/scheduler) | Scheduler primitives — real-time (setTimeout/setInterval) and virtual (min-heap, deterministic) implementations |
| [@studnicky/signal](https://studnicky.github.io/substrate/packages/signal) | AbortSignal composition utilities |
| [@studnicky/sliding-window-limiter](https://studnicky.github.io/substrate/packages/sliding-window-limiter) | Sliding-window rate limiter: exact timestamp-log or approximate blended-counter algorithm |
| [@studnicky/system](https://studnicky.github.io/substrate/packages/system) | CPU/GPU/memory/platform detection for worker sizing |
| [@studnicky/throttle](https://studnicky.github.io/substrate/packages/throttle) | Generic async operation throttle with sliding window concurrency control |
| [@studnicky/timing](https://studnicky.github.io/substrate/packages/timing) | High-resolution timing tracker for collecting operation metrics |
| [@studnicky/types](https://studnicky.github.io/substrate/packages/types) | Shared zero-runtime utility types and type-guard helpers for @studnicky/substrate |
| [@studnicky/visible-range](https://studnicky.github.io/substrate/packages/visible-range) | Pure index/offset arithmetic for computing the visible item range of a virtualized list |
| [@studnicky/worker-pool](https://studnicky.github.io/substrate/packages/worker-pool) | Bounded node:worker_threads pool that fans work items across workers with a typed message envelope and per-task timeout |

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
