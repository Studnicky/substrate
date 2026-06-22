# @studnicky/circular-buffer

> Generic circular buffer with O(1) push and shift operations

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/circular-buffer)

A generic, auto-growing circular buffer for TypeScript. Items pushed past the initial capacity are never evicted — the buffer doubles in size automatically, preserving all data while keeping push and shift at O(1) amortized cost.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/circular-buffer
```

## Usage

```ts
import { CircularBuffer } from '@studnicky/circular-buffer';

// Construct with an initial capacity (default: 128)
const buf = new CircularBuffer<number>(3);

// Push items — grows automatically when full, never evicts
buf.push(1);
buf.push(2);
buf.push(3);
buf.push(4); // capacity doubles to 6; all 4 items are retained

console.log(buf.length); // 4

// Shift items in FIFO order
console.log(buf.shift()); // 1
console.log(buf.shift()); // 2
console.log(buf.shift()); // 3
console.log(buf.shift()); // 4
console.log(buf.shift()); // undefined — empty buffer returns undefined

console.log(buf.length); // 0
```

## Extending

Override the protected lifecycle hooks to observe buffer events without modifying core behavior:

```ts
import { CircularBuffer } from '@studnicky/circular-buffer';

class InstrumentedBuffer<T> extends CircularBuffer<T> {
  readonly growEvents: number[] = [];

  protected override onGrow(oldCapacity: number, newCapacity: number): void {
    this.growEvents.push(newCapacity);
    console.log(`Buffer grew: ${oldCapacity} → ${newCapacity}`);
  }

  protected override onPush(item: T): void {
    console.log('Pushed:', item);
  }

  protected override onShift(item: T): void {
    console.log('Shifted:', item);
  }
}

const buf = new InstrumentedBuffer<string>(2);
buf.push('a');
buf.push('b');
buf.push('c'); // triggers onGrow(2, 4) and onPush('c')

console.log(buf.growEvents); // [4]
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/circular-buffer

## License

MIT
