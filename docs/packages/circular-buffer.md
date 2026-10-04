---
title: "@studnicky/circular-buffer"
description: Generic ring buffer with O(1) push and shift operations.
---

# @studnicky/circular-buffer

> Generic ring buffer with O(1) push and shift operations.

## What it is

`@studnicky/circular-buffer` is a composable fixed-capacity sequence primitive. It keeps insertion and removal predictable and offers a numeric sliding-window specialization; it does not model catalogue, inventory, or order workflows.

## What it is for

Use it when Northstar Books needs a bounded recent-event queue, such as the latest catalogue edits, or a numeric window for local operational measurements. The application chooses the events, capacity, overflow policy, and interpretation of the retained values.

## Northstar Books examples

- **Observed numeric sample buffer** maps recent book-search latency samples to a bounded numeric window. It proves that Northstar can calculate percentiles from a fixed local sample without retaining an unbounded stream.
- **Observed ring buffer — lifecycle hook trace** maps a rolling queue of recent catalogue changes to explicit overflow, eviction, insertion, removal, and growth events. It proves the application can observe capacity behavior while retaining domain ownership outside the buffer.

## Install

```bash
pnpm add @studnicky/circular-buffer
```

## Usage

Fixed-capacity ring buffer. When the buffer is full, the oldest item is evicted and the new item takes its slot. Length stays at capacity:

<<< ../../packages/circular-buffer/examples/basicUsage.ts#usage

## Numeric samples

`SampleBuffer` owns a fixed-capacity numeric sliding window with sorted-cache percentile calculation. It preserves its own seven-hook protocol rather than inheriting the generic ring-buffer protocol. Import it from the canonical subpath:

<<< ../../packages/circular-buffer/examples/sampleBasicUsage.ts#usage

<RunnableExample src="packages/circular-buffer/examples/observedSampleBuffer" title="Observed numeric sample buffer" />

## Try it

### Lifecycle hooks

`TracingBuffer` subclasses `CircularBuffer` and overrides five hooks: `onOverflow`, `onEvict`, `onPush`, `onShift`, and `onGrow`. Two scenarios run: an overwrite-mode ring (capacity 3, 5 pushes — watch 2 overflow and 2 eviction events) and a grow-mode ring (capacity 2, 3 pushes — watch the buffer double to capacity 4 instead of evicting).

<RunnableExample src="packages/circular-buffer/examples/observedCircularBuffer" title="Observed ring buffer — lifecycle hook trace" />

## Public API

Import `CircularBuffer` and `CircularBufferError` from `@studnicky/circular-buffer/node`; import `CircularBufferOptionsEntity` and `CircularBufferStateEntity` from `@studnicky/circular-buffer/entities`; and import `CircularBufferInterface` from `@studnicky/circular-buffer/interfaces`. Construct a ring through `CircularBuffer.create({ capacity, overflow })`. `CircularBufferInterface.length` composes the schema-derived field owned by `CircularBufferStateEntity`. Runtime operations use the `/node` entrypoint; schemas and contracts remain at `/entities` and `/interfaces`. Storage constants are implementation details.

## Extending

`CircularBuffer` is a class; subclass it to add domain-specific behavior. Override the protected hooks `onEvict`, `onGrow`, `onPush`, and `onShift` to observe lifecycle events without coupling business logic to the buffer internals:

<<< ../../packages/circular-buffer/examples/subclassHooks.ts#usage

## Observability hooks

Override any protected hook to observe lifecycle events without coupling to a logger or metrics library.

| Hook                               | When it fires                                                                                         | Args                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `onOverflow(item)`                 | Push onto a full buffer in overwrite mode, before the oldest item is evicted                          | `item: T` — the incoming item                |
| `onEvict(item)`                    | Push onto a full buffer in overwrite mode, after overflow is detected, before the slot is overwritten | `item: T` — the item being dropped           |
| `onPush(item)`                     | End of `push()`, after the item is inserted and length updated (fires in both modes)                  | `item: T` — the item pushed                  |
| `onShift(item)`                    | Inside `shift()`, before returning the item (not called on empty buffer)                              | `item: T` — the item being removed           |
| `onGrow(oldCapacity, newCapacity)` | End of `grow()`, after the buffer has been resized (grow mode only)                                   | `oldCapacity: number`, `newCapacity: number` |

<<< ../../packages/circular-buffer/examples/observedCircularBuffer.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/circular-buffer)

## Entities

`@studnicky/circular-buffer/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import { CircularBufferOptionsEntity } from "@studnicky/circular-buffer/entities";
```

## Interfaces

`@studnicky/circular-buffer/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration and state contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->

```typescript
import type { CircularBufferInterface } from "@studnicky/circular-buffer/interfaces";
```

## Public entrypoints

| Import path                             | Use it when                                                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@studnicky/circular-buffer/node`       | A Northstar Books server or worker needs generic ring-buffer runtime operations and errors.                                                          |
| `@studnicky/circular-buffer/browser`    | A Northstar Books browser bundle needs the same generic ring-buffer primitive; it is a runtime alternative to `/node`, not a separate queue product. |
| `@studnicky/circular-buffer/samples`    | A consumer needs the numeric sliding-window and percentile primitive for measurements such as search latency.                                        |
| `@studnicky/circular-buffer/entities`   | A consumer needs buffer and sample configuration or state schemas as contracts at its boundary.                                                      |
| `@studnicky/circular-buffer/interfaces` | A consumer needs the typed buffer or sample contracts while composing its own workflow.                                                              |

## Exports

| Symbol                        | Purpose                                                             | Import path                             |
| ----------------------------- | ------------------------------------------------------------------- | --------------------------------------- |
| `CircularBuffer`              | Provides circular buffer functionality.                             | `@studnicky/circular-buffer/node`       |
| `CircularBufferError`         | Represents circular buffer failures.                                | `@studnicky/circular-buffer/node`       |
| `CircularBufferOptionsEntity` | Defines circular buffer configuration.                              | `@studnicky/circular-buffer/entities`   |
| `CircularBufferStateEntity`   | Defines circular buffer state.                                      | `@studnicky/circular-buffer/entities`   |
| `CircularBufferInterface`     | Defines the circular buffer contract.                               | `@studnicky/circular-buffer/interfaces` |
| `SampleBuffer`                | Provides fixed-capacity numeric samples and percentile calculation. | `@studnicky/circular-buffer/samples`    |
| `SampleBufferError`           | Represents sample-buffer construction failures.                     | `@studnicky/circular-buffer/samples`    |
| `SampleBufferOptionsEntity`   | Defines sample-buffer construction input.                           | `@studnicky/circular-buffer/entities`   |
| `SampleBufferStateEntity`     | Defines sample-buffer observable state.                             | `@studnicky/circular-buffer/entities`   |
| `SampleBufferInterface`       | Defines the sample-buffer contract.                                 | `@studnicky/circular-buffer/interfaces` |
