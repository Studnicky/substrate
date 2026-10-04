<p align="center"><a href="https://studnicky.github.io/substrate/"><img src="https://raw.githubusercontent.com/Studnicky/substrate/main/docs/public/og-image.png" alt="@studnicky/substrate TypeScript packages" width="1200" /></a></p>

# @studnicky/substrate

Composable TypeScript packages for asynchronous work, state, data, routing, and I/O.

[![CI](https://github.com/Studnicky/substrate/actions/workflows/ci.yml/badge.svg)](https://github.com/Studnicky/substrate/actions/workflows/ci.yml)
[![docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/)
[![node](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](package.json)
[![release](https://img.shields.io/github/v/release/Studnicky/substrate?display_name=tag&color=14b8a6)](https://github.com/Studnicky/substrate/releases)

[Browse all package guides →](https://studnicky.github.io/substrate/packages/)

> [!CAUTION]
> Node runtime imports require Node.js 24 or later. Browser applications import the matching `/browser` entry point.

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
import { Store } from "@studnicky/store/node";
import { BrowserPersistence } from "@studnicky/store/browser";
import type { StoreInterface } from "@studnicky/store/interfaces";
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
<summary><strong>@studnicky/concurrency</strong> — coordinate asynchronous work</summary>

Use it for keyed channels, semaphores, and coalescing when you need lower-level concurrency primitives.

[Read the concurrency guide →](https://studnicky.github.io/substrate/packages/concurrency)

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
<summary><strong>@studnicky/store</strong> — keep observable application state</summary>

Use it for observable state with in-memory or browser-native persistence, ordered cache, durable browser-state synchronization, and normalized entity collections through `@studnicky/store/entity`.

[Read the store guide →](https://studnicky.github.io/substrate/packages/store)

</details>

<details>
<summary><strong>@studnicky/visible-range</strong> — calculate virtualized list ranges</summary>

Use it to determine which item indexes are visible for a scroll offset and viewport.

[Read the visible-range guide →](https://studnicky.github.io/substrate/packages/visible-range)

</details>

### Data

<details>
<summary><strong>@studnicky/cache</strong> — store bounded cached values</summary>

Use it for an LRU cache with optional expiry and capacity limits.

[Read the cache guide →](https://studnicky.github.io/substrate/packages/cache)

</details>

<details>
<summary><strong>@studnicky/json</strong> — work safely with JSON-shaped values</summary>

Use it for common object operations such as merging, cloning, comparing, freezing, and patching.

[Read the json guide →](https://studnicky.github.io/substrate/packages/json)

</details>

<details>
<summary><strong>@studnicky/types</strong> — validate runtime values and compose type guards</summary>

Use it for reusable type guards, predicate composition, JSON boundaries, and runtime operands that retain Date, Map, and Set values.

[Read the types guide →](https://studnicky.github.io/substrate/packages/types)

</details>

<details>
<summary><strong>@studnicky/drilldown</strong> — group, facet, and sort records</summary>

Use it to explore arbitrary record data through deterministic multi-level drilldowns.

[Read the drilldown guide →](https://studnicky.github.io/substrate/packages/drilldown)

</details>

<details>
<summary><strong>@studnicky/filters</strong> — compose declarative filters and deterministic matching-score thresholds</summary>

Use it to express reusable filtering rules over application data and apply focused matching-score thresholds through its matching entrypoint.

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
<summary><strong>@studnicky/resilience</strong> — protect unreliable dependencies</summary>

Use it for circuit breaking, token buckets, keyed and sliding-window limits, and dead-letter queues.

[Read the resilience guide →](https://studnicky.github.io/substrate/packages/resilience)

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

### Foundation

<details>
<summary><strong>@studnicky/eslint-config</strong> — configure ESLint for a TypeScript project</summary>

Use it to apply the shared flat ESLint configuration to your project.

[Read the eslint-config guide →](https://studnicky.github.io/substrate/packages/eslint-config)

</details>

<details>
<summary><strong>@studnicky/entity</strong> — build schema-backed data boundaries</summary>

Use it to define schema-backed data boundaries with validated intake and creation, boundary cloning, and cycle checks.

[Read the entity guide →](https://studnicky.github.io/substrate/packages/entity)

</details>

## License

MIT — see [LICENSE](LICENSE).
