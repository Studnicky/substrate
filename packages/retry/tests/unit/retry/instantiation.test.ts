/**
 * Retry Instantiation Unit Tests
 *
 * Tests for creating Retry instances via constructor, factory, and builder.
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
// Constructor scenarios
// ---------------------------------------------------------------------------

const constructorScenarios: Array<{ description: string; build: () => Retry }> = [
  {
    description: 'creates retry with new Retry({ maxRetries: 5 })',
    build: () => new Retry({ maxRetries: 5 })
  },
  {
    description: 'creates retry with new Retry() using defaults',
    build: () => new Retry()
  },
  {
    description: 'creates retry with new Retry({ errorClassifier, maxRetries })',
    build: () => new Retry({ errorClassifier: new DefaultHttpErrorClassifier(), maxRetries: 3 })
  },
  {
    description: 'creates retry with new Retry({ maxRetries, retryInterceptor })',
    build: () => new Retry({ maxRetries: 3, retryInterceptor: () => ({ delayMs: 100 }) })
  }
];

for (const { description, build } of constructorScenarios) {
  it(description, () => {
    ok(build() instanceof Retry);
  });
}

// ---------------------------------------------------------------------------
// Static factory method scenarios
// ---------------------------------------------------------------------------

const factoryScenarios: Array<{ description: string; build: () => Retry }> = [
  {
    description: 'creates retry with Retry.create({ maxRetries: 5 })',
    build: () => Retry.create({ maxRetries: 5 })
  },
  {
    description: 'creates retry with Retry.create() using defaults',
    build: () => Retry.create()
  }
];

for (const { description, build } of factoryScenarios) {
  it(description, () => {
    ok(build() instanceof Retry);
  });
}

// ---------------------------------------------------------------------------
// Builder pattern scenarios
// ---------------------------------------------------------------------------

const builderScenarios: Array<{ description: string; build: () => Retry }> = [
  {
    description: 'creates retry with new RetryBuilder(Retry).build()',
    build: () => new RetryBuilder(Retry).build()
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
    build: () => Retry.builder().maxRetries(3).errorClassifier(new DefaultHttpErrorClassifier()).build()
  },
  {
    description: 'builds with retryInterceptor and maxRetries',
    build: () => Retry.builder().maxRetries(3).retryInterceptor(() => ({ delayMs: 50 })).build()
  },
  {
    description: 'chains all builder methods: maxRetries + errorClassifier + retryInterceptor',
    build: () => Retry.builder()
      .maxRetries(5)
      .errorClassifier(new DefaultHttpErrorClassifier())
      .retryInterceptor(() => ({ delayMs: 100 }))
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

// ---------------------------------------------------------------------------
// Functional equivalence
// ---------------------------------------------------------------------------

it('constructor and factory produce functionally equivalent instances', async () => {
  const viaConstructor = new Retry({ maxRetries: 3 });
  const viaFactory = Retry.create({ maxRetries: 3 });

  const result1 = await viaConstructor.execute(async () => 'test');
  const result2 = await viaFactory.execute(async () => 'test');

  strictEqual(result1, 'test');
  strictEqual(result2, 'test');
});
