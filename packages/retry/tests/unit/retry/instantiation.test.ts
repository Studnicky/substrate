/**
 * Retry Instantiation Unit Tests
 *
 * Tests for creating Retry instances via factory and builder.
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import {
  DefaultHttpErrorClassifier,
  Retry,
  RetryBuilder
} from '../../../src/retry/index.js';

// ---------------------------------------------------------------------------
// Static factory method scenarios
// ---------------------------------------------------------------------------

const createScenarios: Array<{ description: string; build: () => Retry }> = [
  {
    description: 'creates retry with Retry.create({ maxRetries: 5 })',
    build: () => Retry.create({ maxRetries: 5 })
  },
  {
    description: 'creates retry with Retry.create() using defaults',
    build: () => Retry.create()
  },
  {
    description: 'creates retry with Retry.create({ errorClassifier, maxRetries })',
    build: () => Retry.create({ errorClassifier: DefaultHttpErrorClassifier.create(), maxRetries: 3 })
  }
];

for (const { description, build } of createScenarios) {
  it(description, () => {
    ok(build() instanceof Retry);
  });
}

// ---------------------------------------------------------------------------
// Builder pattern scenarios
// ---------------------------------------------------------------------------

const builderScenarios: Array<{ description: string; build: () => Retry }> = [
  {
    description: 'creates retry with RetryBuilder.create(...).build()',
    build: () => RetryBuilder.create((opts) => Retry.create(opts)).build()
  },
  {
    description: 'creates retry with Retry.builder().build()',
    build: () => Retry.builder().build()
  },
  {
    description: 'builds with custom maxRetries(7)',
    build: () => Retry.builder().maxRetries(7).build()
  },
  {
    description: 'builds with errorClassifier and maxRetries',
    build: () => Retry.builder().maxRetries(3).errorClassifier(DefaultHttpErrorClassifier.create()).build()
  },
  {
    description: 'builds with custom maxElapsedMs(5000)',
    build: () => Retry.builder().maxElapsedMs(5000).build()
  },
  {
    description: 'builds with backoffStrategy',
    build: () => Retry.builder()
      .backoffStrategy({ baseDelayMs: 100, strategy: (attempt, base) => base * (attempt + 1) })
      .build()
  }
];

for (const { description, build } of builderScenarios) {
  it(description, () => {
    ok(build() instanceof Retry);
  });
}

// ---------------------------------------------------------------------------
// Builder fluent return — non-scenario, identity check
// ---------------------------------------------------------------------------

it('builder.maxRetries() returns builder instance for chaining', () => {
  const builder = Retry.builder();
  const result = builder.maxRetries(5);

  strictEqual(result, builder, 'maxRetries should return this');
});

it('builder.backoffStrategy() returns builder instance for chaining', () => {
  const builder = Retry.builder();
  const result = builder.backoffStrategy({ baseDelayMs: 10, strategy: () => 0 });

  strictEqual(result, builder, 'backoffStrategy should return this');
});

// ---------------------------------------------------------------------------
// Builder-configured maxRetries and backoffStrategy drive real retry behavior
// ---------------------------------------------------------------------------

it('builder-configured maxRetries and backoffStrategy drive actual retry behavior', async () => {
  const retry = Retry.builder()
    .maxRetries(10)
    .errorClassifier(() => ({ retryable: true }))
    .backoffStrategy({ baseDelayMs: 5, strategy: () => 1 })
    .build();

  let attempts = 0;

  const result = await retry.execute(async () => {
    attempts++;
    if (attempts <= 3) {throw new Error('transient failure');}
    return 'recovered';
  });

  strictEqual(result, 'recovered');
  strictEqual(attempts, 4);
  strictEqual(retry.getStats().totalRetries, 3);
});

// ---------------------------------------------------------------------------
// Functional equivalence
// ---------------------------------------------------------------------------

it('create and factory produce functionally equivalent instances', async () => {
  const viaCreate = Retry.create({ maxRetries: 3 });
  const viaFactory = Retry.create({ maxRetries: 3 });

  const result1 = await viaCreate.execute(async () => 'test');
  const result2 = await viaFactory.execute(async () => 'test');

  strictEqual(result1, 'test');
  strictEqual(result2, 'test');
});
