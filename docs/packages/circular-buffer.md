---
title: '@studnicky/circular-buffer'
description: Generic circular buffer with O(1) push and shift operations.
---

# @studnicky/circular-buffer

> Generic circular buffer with O(1) push and shift operations.

## Install

```bash
pnpm add @studnicky/circular-buffer
```

## Usage

Push items into the buffer and shift them off in FIFO order. The buffer grows automatically when capacity is reached:

<<< ../../packages/circular-buffer/examples/basicUsage.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/circular-buffer` | `CircularBuffer` |
| `@studnicky/circular-buffer/circular-buffer` | `CircularBuffer` (direct subpath) |
| `@studnicky/circular-buffer/interfaces` | `CircularBufferInterface` |
| `@studnicky/circular-buffer/constants` | Buffer configuration constants |

## Extending

`CircularBuffer` is a class — subclass to add domain-specific behavior. Override the protected hooks `onGrow`, `onPush`, and `onShift` to observe lifecycle events without coupling business logic to the buffer internals:

<<< ../../packages/circular-buffer/examples/subclassHooks.ts#usage

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/circular-buffer)
