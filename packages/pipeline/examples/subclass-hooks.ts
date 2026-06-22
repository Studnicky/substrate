/**
 * Subclass hooks example
 *
 * Demonstrates extending Pipeline<T> to override protected lifecycle hooks.
 * TimedPipeline records start time in onRunStart and attaches elapsed
 * milliseconds to the context in onRunComplete.
 *
 * Run:
 *   npx tsx packages/pipeline/examples/subclass-hooks.ts
 */

import assert from 'node:assert/strict';

import { Pipeline } from '../src/index.js';

interface RequestCtx {
  url: string;
  headers: Record<string, string>;
  elapsed?: number;
}

class TimedPipeline extends Pipeline<RequestCtx> {
  private startTime = 0;

  protected override onRunStart(ctx: RequestCtx): RequestCtx {
    this.startTime = Date.now();
    return ctx;
  }

  protected override onRunComplete(ctx: RequestCtx): RequestCtx {
    return { ...ctx, elapsed: Date.now() - this.startTime };
  }
}

const pipeline = new TimedPipeline();

// Stage: attach an Authorization header
pipeline.add((ctx) => ({
  ...ctx,
  headers: { ...ctx.headers, Authorization: 'Bearer token-abc' },
}));

const result = await pipeline.run({ url: '/api/data', headers: {} });

console.log(`url:           ${result.url}`);
console.log(`Authorization: ${result.headers['Authorization']}`);
console.log(`elapsed:       ${result.elapsed}ms`);

assert.ok(
  result.headers['Authorization'] !== undefined,
  'Authorization header must be set',
);
assert.ok(
  result.elapsed !== undefined && result.elapsed >= 0,
  `elapsed must be a non-negative number, got ${result.elapsed}`,
);

console.log('subclass-hooks: all assertions passed');
