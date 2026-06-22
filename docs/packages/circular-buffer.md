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

```typescript
import { CircularBuffer } from '@studnicky/circular-buffer';

const buffer = new CircularBuffer<string>(5);

buffer.push('a');
buffer.push('b');
buffer.push('c');

console.log(buffer.length); // 3
console.log(buffer.shift()); // 'a'
console.log(buffer.length); // 2

// When capacity is reached, oldest item is overwritten
buffer.push('d');
buffer.push('e');
buffer.push('f'); // overwrites 'b'
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/circular-buffer` | `CircularBuffer` |
| `@studnicky/circular-buffer/circular-buffer` | `CircularBuffer` (direct subpath) |
| `@studnicky/circular-buffer/interfaces` | `CircularBufferInterface` |
| `@studnicky/circular-buffer/constants` | Buffer configuration constants |

## Extending

`CircularBuffer` is a class — subclass to add domain-specific behavior:

```typescript
import { CircularBuffer } from '@studnicky/circular-buffer';

class TimestampedBuffer<T> extends CircularBuffer<{ value: T; at: number }> {
  pushWithTimestamp(value: T): void {
    this.push({ value, at: Date.now() });
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/circular-buffer)
