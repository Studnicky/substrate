<p align="center"><a href="https://studnicky.github.io/substrate/"><img src="https://raw.githubusercontent.com/Studnicky/substrate/main/docs/public/og-image.png" alt="@studnicky/substrate TypeScript packages" width="1200" /></a></p>

# @studnicky/substrate

Composable TypeScript packages for asynchronous work, state, data, routing, and I/O.

[![CI](https://github.com/Studnicky/substrate/actions/workflows/ci.yml/badge.svg)](https://github.com/Studnicky/substrate/actions/workflows/ci.yml)
[![docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/)
[![node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](package.json)
[![release](https://img.shields.io/github/v/release/Studnicky/substrate?display_name=tag&color=14b8a6)](https://github.com/Studnicky/substrate/releases)

[Browse all package guides →](https://studnicky.github.io/substrate/packages/)

> [!CAUTION]
> Packages require Node.js 24 or later. Check the package guide before using a package in a browser or another runtime.

> [!TIP]
> Choose the smallest package that matches the problem you are solving.

> [!NOTE]
> This README helps you choose a package. Complete usage guidance, APIs, and examples are on GitHub Pages.

## Install

Packages are published to GitHub Packages. Add the registry to your project's `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

Install the package you need:

```sh
pnpm add @studnicky/retry
```

## Choose an import path

Runtime APIs use an explicit platform entry point. Import executable code from `/node` in Node.js applications or `/browser` in browser applications. Every package publishes both runtime entrypoints; the public contract remains isomorphic when behavior is shared. Import shared contracts from their neutral feature path; those declarations are identical across runtimes.

```typescript
import { Store } from '@studnicky/store/node';
import { BrowserPersistence } from '@studnicky/store/browser';
import type { StoreInterface } from '@studnicky/store/interfaces';
```

`/interfaces`, `/entities`, and `/types` are portable contract paths; do not put them under `/node` or `/browser`.

## Find a package

### Concurrency

<details>
<summary><strong>@studnicky/retry</strong> — retry transient async operations</summary>

Use it when an operation can fail temporarily and your application decides which failures are safe to retry.

[Read the retry guide →](https://studnicky.github.io/substrate/packages/retry)

</details>

<details>
<summary><strong>@studnicky/throttle</strong> — control concurrent async work</summary>

Use it to limit active operations and protect a constrained service or resource.

[Read the throttle guide →](https://studnicky.github.io/substrate/packages/throttle)

</details>

<details>
<summary><strong>@studnicky/mutex</strong> — serialize work by key</summary>

Use it to prevent conflicting async operations for the same resource.

[Read the mutex guide →](https://studnicky.github.io/substrate/packages/mutex)

</details>

<details>
<summary><strong>@studnicky/batch</strong> — process items in controlled parallel groups</summary>

Use it to process a collection with a bounded amount of parallel work.

[Read the batch guide →](https://studnicky.github.io/substrate/packages/batch)

</details>

<details>
<summary><strong>@studnicky/concurrency</strong> — coordinate asynchronous work</summary>

Use it for keyed channels, semaphores, and coalescing when you need lower-level concurrency primitives.

[Read the concurrency guide →](https://studnicky.github.io/substrate/packages/concurrency)

</details>

<details>
<summary><strong>@studnicky/file-lock</strong> — coordinate access with a file lock</summary>

Use it when separate processes need advisory access to the same filesystem resource.

[Read the file-lock guide →](https://studnicky.github.io/substrate/packages/file-lock)

</details>

<details>
<summary><strong>@studnicky/virtual-fs</strong> — use an in-memory filesystem</summary>

Use it when application code needs a synchronous filesystem abstraction that also works in browsers.

[Read the virtual-fs guide →](https://studnicky.github.io/substrate/packages/virtual-fs)

</details>

<details>
<summary><strong>@studnicky/signal</strong> — compose cancellation and timeouts</summary>

Use it to combine AbortSignals and place time limits around asynchronous operations.

[Read the signal guide →](https://studnicky.github.io/substrate/packages/signal)

</details>

<details>
<summary><strong>@studnicky/idempotency-guard</strong> — deduplicate idempotent requests</summary>

Use it to coalesce in-flight work, replay recent results, and reject conflicting reuse of an idempotency key.

[Read the idempotency-guard guide →](https://studnicky.github.io/substrate/packages/idempotency-guard)

</details>

<details>
<summary><strong>@studnicky/memoize</strong> — cache pure function results</summary>

Use it to cache results by a caller-defined key while sharing concurrent evaluations.

[Read the memoize guide →](https://studnicky.github.io/substrate/packages/memoize)

</details>

<details>
<summary><strong>@studnicky/bounded-dispatcher</strong> — dispatch work within a fixed bound</summary>

Use it to send work through a bounded execution path with scheduling and event delivery.

[Read the bounded-dispatcher guide →](https://studnicky.github.io/substrate/packages/bounded-dispatcher)

</details>

<details>
<summary><strong>@studnicky/keyed-work-gate</strong> — run one operation per key</summary>

Use it to serialize or single-flight work independently for each key.

[Read the keyed-work-gate guide →](https://studnicky.github.io/substrate/packages/keyed-work-gate)

</details>

<details>
<summary><strong>@studnicky/keyed-rate-limiter</strong> — apply rate limits per key</summary>

Use it when each customer, route, or other key needs its own rate-limiting strategy.

[Read the keyed-rate-limiter guide →](https://studnicky.github.io/substrate/packages/keyed-rate-limiter)

</details>

### Time

<details>
<summary><strong>@studnicky/clock</strong> — read injectable wall and monotonic time</summary>

Use it to make time-dependent application code deterministic in tests.

[Read the clock guide →](https://studnicky.github.io/substrate/packages/clock)

</details>

<details>
<summary><strong>@studnicky/scheduler</strong> — schedule real or virtual time-based work</summary>

Use it for timers in production and deterministic time control in tests.

[Read the scheduler guide →](https://studnicky.github.io/substrate/packages/scheduler)

</details>

<details>
<summary><strong>@studnicky/timing</strong> — measure operation duration</summary>

Use it to collect high-resolution timings for an operation.

[Read the timing guide →](https://studnicky.github.io/substrate/packages/timing)

</details>

### State & Flow

<details>
<summary><strong>@studnicky/context</strong> — isolate request context</summary>

Use it to keep request-scoped values available across asynchronous work.

[Read the context guide →](https://studnicky.github.io/substrate/packages/context)

</details>

<details>
<summary><strong>@studnicky/fsm</strong> — model finite state transitions</summary>

Use it when an application feature has explicit states, transitions, and effects.

[Read the fsm guide →](https://studnicky.github.io/substrate/packages/fsm)

</details>

<details>
<summary><strong>@studnicky/pipeline</strong> — run typed async processing stages</summary>

Use it to transform a value through ordered asynchronous stages.

[Read the pipeline guide →](https://studnicky.github.io/substrate/packages/pipeline)

</details>

<details>
<summary><strong>@studnicky/paginator</strong> — track paginated data</summary>

Use it to manage cursor or page-list state from a paginated data source.

[Read the paginator guide →](https://studnicky.github.io/substrate/packages/paginator)

</details>

<details>
<summary><strong>@studnicky/process-kit</strong> — build reducer-and-effects processes</summary>

Use it when a stateful process needs explicit state updates and scheduled effects.

[Read the process-kit guide →](https://studnicky.github.io/substrate/packages/process-kit)

</details>

<details>
<summary><strong>@studnicky/store</strong> — keep observable application state</summary>

Use it for observable state with in-memory or browser-native persistence.

[Read the store guide →](https://studnicky.github.io/substrate/packages/store)

</details>

<details>
<summary><strong>@studnicky/strata-store-kit</strong> — synchronize cache and browser state</summary>

Use it to keep ordered cache and durable browser state aligned.

[Read the strata-store-kit guide →](https://studnicky.github.io/substrate/packages/strata-store-kit)

</details>

<details>
<summary><strong>@studnicky/visible-range</strong> — calculate virtualized list ranges</summary>

Use it to determine which item indexes are visible for a scroll offset and viewport.

[Read the visible-range guide →](https://studnicky.github.io/substrate/packages/visible-range)

</details>

<details>
<summary><strong>@studnicky/flag-evaluator</strong> — evaluate local feature flags</summary>

Use it for deterministic flag decisions, including percentage rollouts.

[Read the flag-evaluator guide →](https://studnicky.github.io/substrate/packages/flag-evaluator)

</details>

### Data

<details>
<summary><strong>@studnicky/cache</strong> — store bounded cached values</summary>

Use it for an LRU cache with optional expiry and capacity limits.

[Read the cache guide →](https://studnicky.github.io/substrate/packages/cache)

</details>

<details>
<summary><strong>@studnicky/entity-store</strong> — manage normalized entities</summary>

Use it to keep ID-indexed records with fast lookup and CRUD operations.

[Read the entity-store guide →](https://studnicky.github.io/substrate/packages/entity-store)

</details>

<details>
<summary><strong>@studnicky/json</strong> — work safely with JSON-shaped values</summary>

Use it for common object operations such as merging, cloning, comparing, freezing, and patching.

[Read the json guide →](https://studnicky.github.io/substrate/packages/json)

</details>

<details>
<summary><strong>@studnicky/types</strong> — use zero-runtime TypeScript helpers</summary>

Use it for reusable utility types, type guards, and predicate helpers.

[Read the types guide →](https://studnicky.github.io/substrate/packages/types)

</details>

<details>
<summary><strong>@studnicky/drilldown</strong> — group, facet, and sort records</summary>

Use it to explore arbitrary record data through deterministic multi-level drilldowns.

[Read the drilldown guide →](https://studnicky.github.io/substrate/packages/drilldown)

</details>

<details>
<summary><strong>@studnicky/filters</strong> — compose declarative filters</summary>

Use it to express reusable filtering rules over application data.

[Read the filters guide →](https://studnicky.github.io/substrate/packages/filters)

</details>

<details>
<summary><strong>@studnicky/config</strong> — validate and clamp configuration</summary>

Use it to turn configuration input into values that satisfy your application limits.

[Read the config guide →](https://studnicky.github.io/substrate/packages/config)

</details>

### Matching & Routing

<details>
<summary><strong>@studnicky/matching</strong> — normalize, compare, and score candidates</summary>

Use it to build deterministic matching and ranking flows over application data.

[Read the matching guide →](https://studnicky.github.io/substrate/packages/matching)

</details>

<details>
<summary><strong>@studnicky/matching-filters</strong> — filter matching scores</summary>

Use it to add focused filters to a deterministic matching result.

[Read the matching-filters guide →](https://studnicky.github.io/substrate/packages/matching-filters)

</details>

<details>
<summary><strong>@studnicky/semantic-matching</strong> — define semantic matching integrations</summary>

Use it when your application supplies vectorization, search, reranking, or classification providers.

[Read the semantic-matching guide →](https://studnicky.github.io/substrate/packages/semantic-matching)

</details>

<details>
<summary><strong>@studnicky/topic-router</strong> — fan out events by topic pattern</summary>

Use it to deliver one published topic to every matching subscriber.

[Read the topic-router guide →](https://studnicky.github.io/substrate/packages/topic-router)

</details>

<details>
<summary><strong>@studnicky/topic-router-models</strong> — describe model-backed topic delivery</summary>

Use it to map model evidence into a topic-delivery flow.

[Read the topic-router-models guide →](https://studnicky.github.io/substrate/packages/topic-router-models)

</details>

### I/O & Observability

<details>
<summary><strong>@studnicky/event-bus</strong> — publish and subscribe with queues</summary>

Use it to deliver events through backpressure-aware subscriber queues.

[Read the event-bus guide →](https://studnicky.github.io/substrate/packages/event-bus)

</details>

<details>
<summary><strong>@studnicky/fetch</strong> — make configured HTTP requests</summary>

Use it for HTTP calls with timeouts and request customization.

[Read the fetch guide →](https://studnicky.github.io/substrate/packages/fetch)

</details>

<details>
<summary><strong>@studnicky/logger</strong> — emit structured application logs</summary>

Use it to write structured logs with child loggers and metadata.

[Read the logger guide →](https://studnicky.github.io/substrate/packages/logger)

</details>

<details>
<summary><strong>@studnicky/errors</strong> — represent API-safe errors</summary>

Use it to create a consistent error hierarchy that serializes to Problem Details.

[Read the errors guide →](https://studnicky.github.io/substrate/packages/errors)

</details>

<details>
<summary><strong>@studnicky/request-executor</strong> — run one resilient HTTP request</summary>

Use it to combine a request, retry policy, cancellation, timing, and request context.

[Read the request-executor guide →](https://studnicky.github.io/substrate/packages/request-executor)

</details>

<details>
<summary><strong>@studnicky/resilience</strong> — protect unreliable dependencies</summary>

Use it for circuit breaking, token buckets, and dead-letter queues.

[Read the resilience guide →](https://studnicky.github.io/substrate/packages/resilience)

</details>

<details>
<summary><strong>@studnicky/sliding-window-limiter</strong> — enforce a sliding-window rate limit</summary>

Use it when you need exact or approximate rate limiting over a time window.

[Read the sliding-window-limiter guide →](https://studnicky.github.io/substrate/packages/sliding-window-limiter)

</details>

<details>
<summary><strong>@studnicky/boundary-kit</strong> — apply a fixed dependency-call boundary</summary>

Use it to combine throttling, circuit breaking, and retry around an external call.

[Read the boundary-kit guide →](https://studnicky.github.io/substrate/packages/boundary-kit)

</details>

<details>
<summary><strong>@studnicky/health-registry</strong> — aggregate named health checks</summary>

Use it to register asynchronous checks and report their combined status.

[Read the health-registry guide →](https://studnicky.github.io/substrate/packages/health-registry)

</details>

<details>
<summary><strong>@studnicky/system</strong> — inspect host capacity</summary>

Use it to read CPU, GPU, memory, and platform information for application sizing.

[Read the system guide →](https://studnicky.github.io/substrate/packages/system)

</details>

<details>
<summary><strong>@studnicky/worker-pool</strong> — run bounded Node worker-thread jobs</summary>

Use it to fan typed work items across a limited pool of Node.js workers.

[Read the worker-pool guide →](https://studnicky.github.io/substrate/packages/worker-pool)

</details>

### Buffers

<details>
<summary><strong>@studnicky/circular-buffer</strong> — keep a fixed-capacity queue</summary>

Use it for constant-time insertion and removal from a bounded circular buffer.

[Read the circular-buffer guide →](https://studnicky.github.io/substrate/packages/circular-buffer)

</details>

<details>
<summary><strong>@studnicky/sample-buffer</strong> — retain numeric samples</summary>

Use it to keep a fixed-size sample set and calculate percentiles.

[Read the sample-buffer guide →](https://studnicky.github.io/substrate/packages/sample-buffer)

</details>

### Foundation

<details>
<summary><strong>@studnicky/eslint-config</strong> — configure ESLint for a TypeScript project</summary>

Use it to apply the shared flat ESLint configuration to your project.

[Read the eslint-config guide →](https://studnicky.github.io/substrate/packages/eslint-config)

</details>

<details>
<summary><strong>@studnicky/intake-kit</strong> — build schema-backed data boundaries</summary>

Use it to define common boundary primitives for schema-backed entity handling.

[Read the intake-kit guide →](https://studnicky.github.io/substrate/packages/intake-kit)

</details>

## License

MIT — see [LICENSE](LICENSE).
