---
title: '@studnicky/sample-buffer'
description: Fixed-capacity numeric sample buffer with percentile calculation.
---

# @studnicky/sample-buffer

> Fixed-capacity circular buffer for numeric samples with percentile calculation.

## Install

```bash
pnpm add @studnicky/sample-buffer
```

## Usage

```typescript
import { SampleBuffer } from '@studnicky/sample-buffer';

const samples = new SampleBuffer(100); // capacity: 100 samples

// Record latency samples
samples.push(12.5);
samples.push(45.2);
samples.push(8.1);

// Percentiles
console.log(samples.percentile(50));  // median
console.log(samples.percentile(95));  // p95
console.log(samples.percentile(99));  // p99

// Stats
console.log(samples.count);  // number of samples recorded
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/sample-buffer` | `SampleBuffer` |
| `@studnicky/sample-buffer/sample-buffer` | `SampleBuffer` (direct subpath) |
| `@studnicky/sample-buffer/interfaces` | `SampleBufferInterface` |
| `@studnicky/sample-buffer/constants` | Default capacity constants |

## Extending

```typescript
import { SampleBuffer } from '@studnicky/sample-buffer';

class AlertingBuffer extends SampleBuffer {
  constructor(capacity: number, private readonly threshold: number) {
    super(capacity);
  }

  override push(sample: number): void {
    super.push(sample);
    if (this.percentile(99) > this.threshold) {
      alerts.trigger('p99-exceeded', { p99: this.percentile(99) });
    }
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/sample-buffer)
