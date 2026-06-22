/**
 * CircuitBreaker Unit Tests
 */

import { rejects, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircuitBreaker } from '../../src/CircuitBreaker.js';
import { CircuitBreakerOpenError } from '../../src/CircuitBreakerOpenError.js';

const succeed = async (): Promise<string> => 'ok';
const fail = async (): Promise<never> => { throw new Error('failure'); };

void describe('CircuitBreaker', () => {
  void describe('initial state', () => {
    void it('starts in closed state', () => {
      const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
      strictEqual(cb.state, 'closed');
    });

    void it('throws RangeError for failureThreshold < 1', () => {
      throws(() => { new CircuitBreaker({ failureThreshold: 0, resetTimeoutMs: 100 }); }, RangeError);
    });

    void it('throws RangeError for resetTimeoutMs < 0', () => {
      throws(() => { new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: -1 }); }, RangeError);
    });
  });

  void describe('closed → open transition', () => {
    void it('trips to open after failureThreshold failures', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
      await rejects(() => cb.execute(fail));
      strictEqual(cb.state, 'closed');
      await rejects(() => cb.execute(fail));
      strictEqual(cb.state, 'open');
    });

    void it('resets failure count on success in closed state', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 });
      await rejects(() => cb.execute(fail));
      await rejects(() => cb.execute(fail));
      await cb.execute(succeed); // success resets count
      await rejects(() => cb.execute(fail));
      await rejects(() => cb.execute(fail));
      strictEqual(cb.state, 'closed'); // still needs one more to trip
      await rejects(() => cb.execute(fail));
      strictEqual(cb.state, 'open');
    });
  });

  void describe('open state', () => {
    void it('throws CircuitBreakerOpenError when open', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 10_000 });
      await rejects(() => cb.execute(fail));
      strictEqual(cb.state, 'open');
      await rejects(
        () => cb.execute(succeed),
        (err: unknown) => err instanceof CircuitBreakerOpenError
      );
    });

    void it('CircuitBreakerOpenError includes name in message', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 10_000, name: 'my-cb' });
      await rejects(() => cb.execute(fail));
      await rejects(
        () => cb.execute(succeed),
        (err: unknown) => err instanceof CircuitBreakerOpenError && err.message.includes('my-cb')
      );
    });
  });

  void describe('open → halfOpen transition (injectable clock)', () => {
    void it('transitions to halfOpen after resetTimeoutMs', async () => {
      let time = 0;
      const clock = (): number => time;
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });

      await rejects(() => cb.execute(fail));
      strictEqual(cb.state, 'open');

      time = 100;
      // checkHalfOpen is called inside execute
      await cb.execute(succeed);
      strictEqual(cb.state, 'closed');
    });

    void it('stays open before resetTimeoutMs elapses', async () => {
      let time = 0;
      const clock = (): number => time;
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });

      await rejects(() => cb.execute(fail));
      strictEqual(cb.state, 'open');

      time = 99;
      await rejects(
        () => cb.execute(succeed),
        (err: unknown) => err instanceof CircuitBreakerOpenError
      );
      strictEqual(cb.state, 'open');
    });
  });

  void describe('halfOpen → closed (successThreshold)', () => {
    void it('returns to closed after successThreshold successes in halfOpen', async () => {
      let time = 0;
      const clock = (): number => time;
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, successThreshold: 2, clock });

      await rejects(() => cb.execute(fail));
      time = 100;

      await cb.execute(succeed);
      strictEqual(cb.state, 'halfOpen'); // only 1 success so far
      await cb.execute(succeed);
      strictEqual(cb.state, 'closed');
    });
  });

  void describe('halfOpen → open (failure)', () => {
    void it('failure in halfOpen re-opens the circuit', async () => {
      let time = 0;
      const clock = (): number => time;
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });

      await rejects(() => cb.execute(fail));
      time = 100;
      await rejects(() => cb.execute(fail)); // halfOpen → open
      strictEqual(cb.state, 'open');
    });
  });

  void describe('reset / forceClosed / forceOpen', () => {
    void it('reset() returns to closed from open', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100 });
      await rejects(() => cb.execute(fail));
      strictEqual(cb.state, 'open');
      cb.reset();
      strictEqual(cb.state, 'closed');
    });

    void it('forceClosed() closes from open', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100 });
      await rejects(() => cb.execute(fail));
      cb.forceClosed();
      strictEqual(cb.state, 'closed');
    });

    void it('forceOpen() opens from closed', () => {
      const cb = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 100 });
      strictEqual(cb.state, 'closed');
      cb.forceOpen();
      strictEqual(cb.state, 'open');
    });

    void it('execute succeeds after reset', async () => {
      const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100 });
      await rejects(() => cb.execute(fail));
      cb.reset();
      const result = await cb.execute(succeed);
      strictEqual(result, 'ok');
    });
  });
});
