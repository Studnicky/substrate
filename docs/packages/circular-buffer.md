---
title: '@studnicky/circular-buffer'
description: Generic ring buffer with O(1) push and shift operations.
---

# @studnicky/circular-buffer

> Generic ring buffer with O(1) push and shift operations.

## Install

```bash
pnpm add @studnicky/circular-buffer
```

## Usage

Fixed-capacity ring buffer. When the buffer is full, the oldest item is evicted and the new item takes its slot. Length stays at capacity:

<<< ../../packages/circular-buffer/examples/basicUsage.ts#usage

## Try it

### Lifecycle hooks

`TracingBuffer` subclasses `CircularBuffer` and overrides five hooks: `onOverflow`, `onEvict`, `onPush`, `onShift`, and `onGrow`. Two scenarios run: an overwrite-mode ring (capacity 3, 5 pushes — watch 2 overflow and 2 eviction events) and a grow-mode ring (capacity 2, 3 pushes — watch the buffer double to capacity 4 instead of evicting).

<RunnableExample src="packages/circular-buffer/examples/observedCircularBuffer" title="Observed ring buffer — lifecycle hook trace" />

## Public API

Import `CircularBuffer`, `CircularBufferOptionsEntity`, `CircularBufferStateEntity`, `CircularBufferError`, and `CircularBufferInterface` from `@studnicky/circular-buffer`. Construct a ring through `CircularBuffer.create({ capacity, overflow })`. `CircularBufferInterface.length` composes the schema-derived field owned by `CircularBufferStateEntity`. The package root is the only public code entrypoint; storage constants are implementation details.

## Extending

`CircularBuffer` is a class; subclass it to add domain-specific behavior. Override the protected hooks `onEvict`, `onGrow`, `onPush`, and `onShift` to observe lifecycle events without coupling business logic to the buffer internals:

<<< ../../packages/circular-buffer/examples/subclassHooks.ts#usage

## Observability hooks

Override any protected hook to observe lifecycle events without coupling to a logger or metrics library.

| Hook | When it fires | Args |
|------|---------------|------|
| `onOverflow(item)` | Push onto a full buffer in overwrite mode, before the oldest item is evicted | `item: T` — the incoming item |
| `onEvict(item)` | Push onto a full buffer in overwrite mode, after overflow is detected, before the slot is overwritten | `item: T` — the item being dropped |
| `onPush(item)` | End of `push()`, after the item is inserted and length updated (fires in both modes) | `item: T` — the item pushed |
| `onShift(item)` | Inside `shift()`, before returning the item (not called on empty buffer) | `item: T` — the item being removed |
| `onGrow(oldCapacity, newCapacity)` | End of `grow()`, after the buffer has been resized (grow mode only) | `oldCapacity: number`, `newCapacity: number` |

<<< ../../packages/circular-buffer/examples/observedCircularBuffer.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/circular-buffer)
