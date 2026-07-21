/**
 * Regression test: `Throttle#execute()` resolves `undefined` both when it aborts a call
 * before `fn` ever runs AND whenever `fn` itself legitimately resolves `undefined`/`void`.
 * `BoundaryKit#execute()` must not conflate the two — it tracks whether `fn` actually ran
 * via a closure flag, not by comparing the resolved value to `undefined`.
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { Throttle } from '@studnicky/throttle';

import { BoundaryKitAbortedError } from '../../../src/errors/BoundaryKitAbortedError.js';
import { BoundaryKit } from '../../../src/index.js';

void it('does not throw BoundaryKitAbortedError when fn legitimately resolves undefined', async () => {
  const kit = BoundaryKit.create();

  let ran = false;
  const voidWork = async (): Promise<void> => {
    ran = true;
  };

  const result = await kit.execute(voidWork);

  assert.equal(result, undefined);
  assert.equal(ran, true, 'fn must have actually run');
});

void it('throws BoundaryKitAbortedError when the throttle discards a queued call before fn runs', async () => {
  const throttle = Throttle.create({ 'concurrencyLimit': 1 });
  const kit = BoundaryKit.create({ 'throttle': throttle });

  let ran = false;
  const blockingWork = async (): Promise<string> => {
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    return 'done';
  };
  const queuedWork = async (): Promise<void> => {
    ran = true;
  };

  const first = kit.execute(blockingWork);
  const queued = kit.execute(queuedWork);

  await throttle.abort();

  await first.catch(() => {});
  await assert.rejects(() => queued, BoundaryKitAbortedError);
  assert.equal(ran, false, 'fn must never have run for the aborted, still-queued call');
});
