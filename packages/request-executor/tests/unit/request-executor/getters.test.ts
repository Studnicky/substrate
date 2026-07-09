/**
 * Getter identity tests — strict identity, not deep equality
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Context } from '@studnicky/context';
import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import { Signal } from '@studnicky/signal';
import { Timing } from '@studnicky/timing';

import { RequestExecutor } from '../../../src/index.js';

it('getters return the exact instances passed into create()', () => {
  const fetchClient = FetchClient.create();
  const retry = Retry.create();
  const signal = Signal.create();
  const timing = Timing.create();
  const context = Context.create({ 'name': 'getters-test' });

  const executor = RequestExecutor.create({
    'context': context,
    'fetchClient': fetchClient,
    'retry': retry,
    'signal': signal,
    'timing': timing
  });

  strictEqual(executor.getFetchClient(), fetchClient);
  strictEqual(executor.getRetry(), retry);
  strictEqual(executor.getSignal(), signal);
  strictEqual(executor.getTiming(), timing);
  strictEqual(executor.getContext(), context);
});
