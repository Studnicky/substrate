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

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/circular-buffer` | `CircularBuffer`, `CircularBufferBuilder`, `CircularBufferOptionsEntity` |
| `@studnicky/circular-buffer/circular-buffer` | `CircularBuffer`, `CircularBufferBuilder` (direct subpath) |
| `@studnicky/circular-buffer/interfaces` | `CircularBufferInterface` |
| `@studnicky/circular-buffer/constants` | Buffer configuration constants |

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
