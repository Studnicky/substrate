---
title: '@studnicky/bounded-dispatcher'
description: Bound concurrent asynchronous work and publish its outcomes.
---

# @studnicky/bounded-dispatcher

> Run asynchronous work with a configurable concurrency limit, outcome events, and delayed dispatch.

## Install

```bash
pnpm add @studnicky/bounded-dispatcher
```

## Usage

Import `BoundedDispatcher` from `@studnicky/bounded-dispatcher/node`. Use `dispatch(fn)` to run a task within the configured limit. Subscribe to the `dispatch` topic for `start`, `success`, and `error` events. `scheduleDispatch(atMs, fn)` returns a cancellable task for delayed work.

<<< ../../packages/bounded-dispatcher/examples/observedBoundedDispatcher.ts#usage

## Configure

| Config key | Accepts | Default |
|------------|---------|---------|
| `permits` | Maximum number of active tasks | `1` |
| `bus` | An `EventBus` or bus options | A new event bus |
| `scheduler` | A scheduler provider | A real-time scheduler |

Use `getBus()` to subscribe to events and `getHookErrors()` to inspect event-publication failures. Supply a `VirtualScheduler` when your application controls time.

## Try it

<RunnableExample src="packages/bounded-dispatcher/examples/observedBoundedDispatcher" title="Bounded dispatch and scheduled work" />

## Entities

Use `@studnicky/bounded-dispatcher/entities` for JSON dispatch-event data.

<!-- inline-ts-ok: published import path -->
```typescript
import { BoundedDispatcherStartEventEntity } from '@studnicky/bounded-dispatcher/entities';
```

## Interfaces

Use `@studnicky/bounded-dispatcher/interfaces` for configuration and event contracts.

<!-- inline-ts-ok: published import path -->
```typescript
import type { BoundedDispatcherConfigInterface } from '@studnicky/bounded-dispatcher/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `BoundedDispatcher` | Runs bounded asynchronous work. | `@studnicky/bounded-dispatcher/node` |
