/**
 * Test fixture worker for @studnicky/worker-pool's own test suite.
 *
 * Receives one message: `{ value, ms?, error?, barrier?, barrierTarget? }`.
 *   - Waits `ms` (default 0) before responding, to make bounded-concurrency provable via timing.
 *   - Posts a 'log' and a 'progress' envelope along the way, to cover every envelope variant.
 *   - When `barrier` (a `SharedArrayBuffer` backing an `Int32Array`) and `barrierTarget` are both
 *     set, blocks via `Atomics.wait` until the shared counter at index 0 reaches `barrierTarget`
 *     before posting its final envelope. The parent increments that counter as it observes other
 *     workers' 'result' envelopes, so this makes ordering relative to sibling workers
 *     deterministic instead of a race between two independent worker threads' message delivery.
 *     Omitted entirely, this step is skipped and behavior is unchanged.
 *   - If `error` is set, posts an 'error' envelope with that string instead of a result.
 *   - Otherwise posts a 'result' envelope with `value` unchanged.
 */
import type { MessagePort } from 'node:worker_threads';

import { RuntimeError } from '@studnicky/errors/node';
import { setTimeout } from 'node:timers/promises';
import { parentPort } from 'node:worker_threads';

import { WorkerReply } from './WorkerReply.js';

interface EchoRequestInterface {
  readonly 'barrier'?: SharedArrayBuffer;
  readonly 'barrierTarget'?: number;
  readonly 'error'?: string;
  readonly 'ms'?: number;
  readonly 'value': unknown;
}

class EchoWorker {
  private static readonly barrierTimeoutMs = 5000;

  static start(): void {
    if (parentPort === null) {
      throw RuntimeError.create('echoWorker must run in a worker thread');
    }
    const port = parentPort;

    port.once('message', (message: EchoRequestInterface) => {
      void EchoWorker.handle(port, message);
    });
  }

  private static awaitBarrier(barrier: SharedArrayBuffer, target: number): void {
    const view = new Int32Array(barrier);
    const deadline = Date.now() + EchoWorker.barrierTimeoutMs;

    let current = Atomics.load(view, 0);
    while (current < target) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) { break; }
      Atomics.wait(view, 0, current, remaining);
      current = Atomics.load(view, 0);
    }
  }

  private static describeValue(value: unknown): string {
    try {
      const serialized = JSON.stringify(value);
      return serialized;
    } catch (cause) {
      throw RuntimeError.create('Echo worker value is not JSON-serializable.', { 'cause': cause });
    }
  }

  private static async handle(port: MessagePort, message: EchoRequestInterface): Promise<void> {
    const { barrier, barrierTarget, error, ms, value } = message;

    WorkerReply.post(port, { 'message': `received ${EchoWorker.describeValue(value)}`, 'type': 'log' });

    if (typeof ms === 'number' && ms > 0) {
      await setTimeout(ms);
    }

    WorkerReply.post(port, { 'percent': 100, 'type': 'progress' });

    if (barrier instanceof SharedArrayBuffer && typeof barrierTarget === 'number') {
      EchoWorker.awaitBarrier(barrier, barrierTarget);
    }

    if (typeof error === 'string') {
      WorkerReply.post(port, { 'error': error, 'type': 'error' });
    } else {
      WorkerReply.post(port, { 'type': 'result', 'value': value });
    }
  }
}

EchoWorker.start();
