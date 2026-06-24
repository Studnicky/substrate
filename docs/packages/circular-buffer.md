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

Fixed-capacity ring buffer — when the buffer is full, the oldest item is evicted and the new item takes its slot. Length stays at capacity:

<<< ../../packages/circular-buffer/examples/basicUsage.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/circular-buffer` | `CircularBuffer`, `CircularBufferBuilder`, `CircularBufferOptionsEntity` |
| `@studnicky/circular-buffer/circular-buffer` | `CircularBuffer`, `CircularBufferBuilder` (direct subpath) |
| `@studnicky/circular-buffer/interfaces` | `CircularBufferInterface` |
| `@studnicky/circular-buffer/constants` | Buffer configuration constants |

## Extending

`CircularBuffer` is a class — subclass to add domain-specific behavior. Override the protected hooks `onEvict`, `onGrow`, `onPush`, and `onShift` to observe lifecycle events without coupling business logic to the buffer internals:

<<< ../../packages/circular-buffer/examples/subclassHooks.ts#usage

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/circular-buffer)
