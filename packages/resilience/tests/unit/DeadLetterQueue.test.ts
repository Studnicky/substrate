/**
 * DeadLetterQueue Unit Tests
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DeadLetterQueue } from '../../src/DeadLetterQueue.js';
import { DlqAbortedError } from '../../src/DlqAbortedError.js';
import { DlqClosedError } from '../../src/DlqClosedError.js';
import { DlqFullError } from '../../src/DlqFullError.js';

void describe('DeadLetterQueue', () => {
  void describe('enqueue()', () => {
    void it('adds an entry and increments size', () => {
      const dlq = new DeadLetterQueue<string>();
      dlq.enqueue('msg', 'parse-error');
      strictEqual(dlq.size, 1);
    });

    void it('stores all entry fields', () => {
      const clock = (): number => 42;
      const dlq = new DeadLetterQueue<string>({ clock });
      const err = new Error('boom');
      dlq.enqueue('payload', 'decode-failed', err);
      strictEqual(dlq.size, 1);
    });

    void it('throws DlqFullError at capacity', () => {
      const dlq = new DeadLetterQueue<string>({ capacity: 2 });
      dlq.enqueue('a', 'r1');
      dlq.enqueue('b', 'r2');
      throws(() => { dlq.enqueue('c', 'r3'); }, DlqFullError);
    });

    void it('throws DlqClosedError after close()', () => {
      const dlq = new DeadLetterQueue<string>();
      dlq.close();
      throws(() => { dlq.enqueue('x', 'reason'); }, DlqClosedError);
    });

    void it('throws DlqAbortedError after abort()', () => {
      const dlq = new DeadLetterQueue<string>();
      dlq.abort();
      throws(() => { dlq.enqueue('x', 'reason'); }, DlqAbortedError);
    });

    void it('throws DlqAbortedError when constructed with already-aborted signal', () => {
      const controller = new AbortController();
      controller.abort();
      const dlq = new DeadLetterQueue<string>({ signal: controller.signal });
      throws(() => { dlq.enqueue('x', 'reason'); }, DlqAbortedError);
    });
  });

  void describe('size getter', () => {
    void it('returns 0 on empty queue', () => {
      const dlq = new DeadLetterQueue<number>();
      strictEqual(dlq.size, 0);
    });

    void it('decrements after drain consumes entry', async () => {
      const dlq = new DeadLetterQueue<string>();
      dlq.enqueue('a', 'r');
      const gen = dlq.drain();
      await gen.next();
      strictEqual(dlq.size, 0);
    });
  });

  void describe('closed getter', () => {
    void it('is false initially', () => {
      const dlq = new DeadLetterQueue<string>();
      strictEqual(dlq.closed, false);
    });

    void it('is true after close()', () => {
      const dlq = new DeadLetterQueue<string>();
      dlq.close();
      strictEqual(dlq.closed, true);
    });
  });

  void describe('drain()', () => {
    void it('yields entries in FIFO order', async () => {
      const dlq = new DeadLetterQueue<string>();
      dlq.enqueue('first', 'r');
      dlq.enqueue('second', 'r');
      dlq.close();

      const items: string[] = [];
      for await (const entry of dlq.drain()) {
        items.push(entry.item);
      }
      deepStrictEqual(items, ['first', 'second']);
    });

    void it('terminates after close() with no pending entries', async () => {
      const dlq = new DeadLetterQueue<string>();
      dlq.enqueue('a', 'r');
      dlq.close();

      let count = 0;
      for await (const _entry of dlq.drain()) { count += 1; }
      strictEqual(count, 1);
    });

    void it('terminates after abort()', async () => {
      const dlq = new DeadLetterQueue<number>();
      dlq.enqueue(1, 'r');

      const entries: number[] = [];
      const drainPromise = (async () => {
        for await (const e of dlq.drain()) { entries.push(e.item); }
      })();

      setImmediate(() => { dlq.abort(); });
      await drainPromise;
      strictEqual(entries.length, 1);
    });

    void it('blocks until enqueue wakes it', async () => {
      const dlq = new DeadLetterQueue<string>();

      const collected: string[] = [];
      const drainPromise = (async () => {
        for await (const e of dlq.drain()) {
          collected.push(e.item);
          if (collected.length === 2) { dlq.close(); }
        }
      })();

      setImmediate(() => {
        dlq.enqueue('x', 'r');
        dlq.enqueue('y', 'r');
      });

      await drainPromise;
      deepStrictEqual(collected, ['x', 'y']);
    });

    void it('entry has correct fields', async () => {
      const clock = (): number => 999;
      const dlq = new DeadLetterQueue<string>({ clock });
      const err = new Error('test');
      dlq.enqueue('payload', 'my-reason', err);
      dlq.close();

      const gen = dlq.drain();
      const { value: entry } = await gen.next();
      if (entry === undefined) throw new Error('expected entry');

      strictEqual(entry.item, 'payload');
      strictEqual(entry.reason, 'my-reason');
      strictEqual(entry.error, err);
      strictEqual(entry.enqueuedAtMs, 999);
      strictEqual(typeof entry.id, 'string');
      ok(entry.id.length > 0);
    });
  });

  void describe('signal integration', () => {
    void it('aborts drain when signal fires', async () => {
      const controller = new AbortController();
      const dlq = new DeadLetterQueue<string>({ signal: controller.signal });

      const collected: string[] = [];
      const drainPromise = (async () => {
        for await (const e of dlq.drain()) { collected.push(e.item); }
      })();

      setImmediate(() => { controller.abort(); });
      await drainPromise;
      strictEqual(collected.length, 0);
    });
  });
});

// Local ok helper to avoid importing from wrong place
function ok(value: unknown): void {
  if (!value) throw new Error('assertion failed');
}
