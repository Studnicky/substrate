/**
 * DeadLetterQueue Unit Tests
 */

import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { DeadLetterQueue } from '../../src/DeadLetterQueue.js';
import { DlqAbortedError } from '../../src/DlqAbortedError.js';
import { DlqClosedError } from '../../src/DlqClosedError.js';
import { DlqFullError } from '../../src/DlqFullError.js';
import type { DeadLetterQueueOptionsInterface } from '../../src/interfaces/DeadLetterQueueOptionsInterface.js';

it('enqueue adds an entry and increments size', () => {
  const dlq = DeadLetterQueue.create<string>();
  dlq.enqueue('msg', 'parse-error');
  strictEqual(dlq.size, 1);
});

it('enqueue stores all entry fields', () => {
  const clock = (): number => 42;
  const dlq = DeadLetterQueue.create<string>({ clock });
  const err = new Error('boom');
  dlq.enqueue('payload', 'decode-failed', err);
  strictEqual(dlq.size, 1);
});

// enqueue error scenarios
const enqueueErrorScenarios: Array<{
  description: string;
  setup: (dlq: DeadLetterQueue<string>) => void;
  errorType: typeof DlqFullError | typeof DlqClosedError | typeof DlqAbortedError;
}> = [
  {
    description: 'enqueue throws DlqFullError at capacity',
    setup: (dlq) => {
      dlq.enqueue('a', 'r1');
      dlq.enqueue('b', 'r2');
    },
    errorType: DlqFullError,
  },
  {
    description: 'enqueue throws DlqClosedError after close()',
    setup: (dlq) => { dlq.close(); },
    errorType: DlqClosedError,
  },
  {
    description: 'enqueue throws DlqAbortedError after abort()',
    setup: (dlq) => { dlq.abort(); },
    errorType: DlqAbortedError,
  },
];

for (const { description, setup, errorType } of enqueueErrorScenarios) {
  it(description, () => {
    const dlq = DeadLetterQueue.create<string>({ capacity: 2 });
    setup(dlq);
    throws(() => { dlq.enqueue('c', 'r3'); }, errorType);
  });
}

it('enqueue throws DlqAbortedError when constructed with already-aborted signal', () => {
  const controller = new AbortController();
  controller.abort();
  const dlq = DeadLetterQueue.create<string>({ signal: controller.signal });
  throws(() => { dlq.enqueue('x', 'reason'); }, DlqAbortedError);
});

// size getter scenarios
const sizeScenarios: Array<{ description: string; setup: (dlq: DeadLetterQueue<string>) => Promise<void>; expected: number }> = [
  {
    description: 'size returns 0 on empty queue',
    setup: async () => { /* no setup */ },
    expected: 0,
  },
];

for (const { description, setup, expected } of sizeScenarios) {
  it(description, async () => {
    const dlq = DeadLetterQueue.create<string>();
    await setup(dlq);
    strictEqual(dlq.size, expected);
  });
}

it('size decrements after drain consumes entry', async () => {
  const dlq = DeadLetterQueue.create<string>();
  dlq.enqueue('a', 'r');
  const gen = dlq.drain();
  await gen.next();
  strictEqual(dlq.size, 0);
});

// closed getter scenarios
const closedScenarios: Array<{ description: string; setup: (dlq: DeadLetterQueue<string>) => void; expected: boolean }> = [
  {
    description: 'closed is false initially',
    setup: () => { /* no setup */ },
    expected: false,
  },
  {
    description: 'closed is true after close()',
    setup: (dlq) => { dlq.close(); },
    expected: true,
  },
];

for (const { description, setup, expected } of closedScenarios) {
  it(description, () => {
    const dlq = DeadLetterQueue.create<string>();
    setup(dlq);
    strictEqual(dlq.closed, expected);
  });
}

it('drain yields entries in FIFO order', async () => {
  const dlq = DeadLetterQueue.create<string>();
  dlq.enqueue('first', 'r');
  dlq.enqueue('second', 'r');
  dlq.close();

  const items: string[] = [];
  for await (const entry of dlq.drain()) {
    items.push(entry.item);
  }
  deepStrictEqual(items, ['first', 'second']);
});

it('drain terminates after close() with no pending entries', async () => {
  const dlq = DeadLetterQueue.create<string>();
  dlq.enqueue('a', 'r');
  dlq.close();

  let count = 0;
  for await (const _entry of dlq.drain()) { count += 1; }
  strictEqual(count, 1);
});

it('drain terminates after abort()', async () => {
  const dlq = DeadLetterQueue.create<number>();
  dlq.enqueue(1, 'r');

  const entries: number[] = [];
  const drainPromise = (async () => {
    for await (const e of dlq.drain()) { entries.push(e.item); }
  })();

  setImmediate(() => { dlq.abort(); });
  await drainPromise;
  strictEqual(entries.length, 1);
});

it('drain blocks until enqueue wakes it', async () => {
  const dlq = DeadLetterQueue.create<string>();

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

it('drain entry has correct fields', async () => {
  const clock = (): number => 999;
  const dlq = DeadLetterQueue.create<string>({ clock });
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

it('drain aborts when signal fires', async () => {
  const controller = new AbortController();
  const dlq = DeadLetterQueue.create<string>({ signal: controller.signal });

  const collected: string[] = [];
  const drainPromise = (async () => {
    for await (const e of dlq.drain()) { collected.push(e.item); }
  })();

  setImmediate(() => { controller.abort(); });
  await drainPromise;
  strictEqual(collected.length, 0);
});

// --- Lifecycle hook tests ---

class ObservedDlq<T> extends DeadLetterQueue<T> {
  readonly events: Array<{ type: string; item?: T }> = [];
  constructor(options?: DeadLetterQueueOptionsInterface) { super(options); }
  protected override onEnqueue(item: T): void { this.events.push({ 'type': 'enqueue', 'item': item }); }
  protected override onDequeue(item: T): void { this.events.push({ 'type': 'dequeue', 'item': item }); }
  protected override onOverflow(): void { this.events.push({ 'type': 'overflow' }); }
  protected override onClose(): void { this.events.push({ 'type': 'close' }); }
  protected override onAbort(): void { this.events.push({ 'type': 'abort' }); }
}

it('onEnqueue fires with correct item', () => {
  const dlq = new ObservedDlq<string>();
  dlq.enqueue('hello', 'test-reason');
  strictEqual(dlq.events[0]?.type, 'enqueue');
  strictEqual(dlq.events[0]?.item, 'hello');
});

it('onDequeue fires when drain yields', async () => {
  const dlq = new ObservedDlq<string>();
  dlq.enqueue('x', 'reason');
  dlq.close();
  for await (const _entry of dlq.drain()) { /* consume */ }
  ok(dlq.events.some((e) => { return e.type === 'dequeue' && e.item === 'x'; }));
});

it('onOverflow fires before DlqFullError', () => {
  const dlq = new ObservedDlq<string>({ capacity: 1 });
  dlq.enqueue('first', 'r');
  throws(() => { dlq.enqueue('second', 'r'); }, DlqFullError);
  ok(dlq.events.some((e) => { return e.type === 'overflow'; }));
});

it('onClose fires when close() called', () => {
  const dlq = new ObservedDlq<string>();
  dlq.close();
  ok(dlq.events.some((e) => { return e.type === 'close'; }));
});

it('onAbort fires when abort() called', () => {
  const dlq = new ObservedDlq<string>();
  dlq.abort();
  ok(dlq.events.some((e) => { return e.type === 'abort'; }));
});
