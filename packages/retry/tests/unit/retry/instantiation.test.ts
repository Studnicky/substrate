/**
 * Retry Instantiation Unit Tests
 *
 * Tests for creating Retry instances via constructor, factory, and builder
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  DefaultHttpErrorClassifier,
  Retry,
  RetryBuilder
} from '../../../src/retry/index.js';

void describe('Retry Instantiation', () => {
  void describe('constructor', () => {
    void it('creates retry with new Retry()', () => {
      const retry = new Retry({ maxRetries: 5 });

      ok(retry instanceof Retry, 'Should be instance of Retry');
    });

    void it('creates retry with no config (uses defaults)', () => {
      const retry = new Retry();

      ok(retry instanceof Retry, 'Should be instance of Retry');
    });

    void it('creates retry with errorClassifier', () => {
      const classifier = new DefaultHttpErrorClassifier();
      const retry = new Retry({
        errorClassifier: classifier,
        maxRetries: 3
      });

      ok(retry instanceof Retry);
    });

    void it('creates retry with retryInterceptor', () => {
      const retry = new Retry({
        maxRetries: 3,
        retryInterceptor: () => {
          return { delayMs: 100 };
        }
      });

      ok(retry instanceof Retry);
    });
  });

  void describe('static factory method', () => {
    void it('creates retry with Retry.create(config)', () => {
      const retry = Retry.create({ maxRetries: 5 });

      ok(retry instanceof Retry, 'Should return Retry instance');
    });

    void it('creates retry with Retry.create() and no config', () => {
      const retry = Retry.create();

      ok(retry instanceof Retry, 'Should use defaults');
    });
  });

  void describe('builder pattern', () => {
    void it('creates retry with new RetryBuilder().build()', () => {
      const retry = new RetryBuilder(Retry).build();

      ok(retry instanceof Retry, 'Should return Retry instance');
    });

    void it('creates retry with Retry.builder().build()', () => {
      const retry = Retry.builder().build();

      ok(retry instanceof Retry, 'Should return Retry instance');
    });

    void it('builds with custom max retries', () => {
      const retry = Retry.builder()
        .maxRetries(7)
        .build();

      ok(retry instanceof Retry);
    });

    void it('builds with error classifier', () => {
      const retry = Retry.builder()
        .maxRetries(3)
        .errorClassifier(new DefaultHttpErrorClassifier())
        .build();

      ok(retry instanceof Retry);
    });

    void it('builds with retry interceptor', () => {
      const retry = Retry.builder()
        .maxRetries(3)
        .retryInterceptor(() => {
          return { delayMs: 50 };
        })
        .build();

      ok(retry instanceof Retry);
    });

    void it('chains all builder methods', () => {
      const retry = Retry.builder()
        .maxRetries(5)
        .errorClassifier(new DefaultHttpErrorClassifier())
        .retryInterceptor(() => {
          return { delayMs: 100 };
        })
        .build();

      ok(retry instanceof Retry);
    });

    void it('returns builder instance for chaining', () => {
      const builder = Retry.builder();
      const result = builder.maxRetries(5);

      strictEqual(result, builder, 'maxRetries should return this');
    });
  });

  void describe('functional equivalence', () => {
    void it('constructor and factory produce equivalent instances', async () => {
      const viaConstructor = new Retry({ maxRetries: 3 });
      const viaFactory = Retry.create({ maxRetries: 3 });

      // Both should work the same way
      const result1 = await viaConstructor.execute(async () => {
        return 'test';
      });
      const result2 = await viaFactory.execute(async () => {
        return 'test';
      });

      strictEqual(result1, 'test');
      strictEqual(result2, 'test');
    });
  });
});
