/**
 * subclass-hooks — extend Pipeline<T> to override protected lifecycle hooks.
 * TimedPipeline records start time in onRunStart and attaches elapsed
 * milliseconds to the context in onRunComplete.
 *
 * Run: npx tsx packages/pipeline/examples/subclass-hooks.ts
 */

import assert from 'node:assert/strict';

// #region usage
import { Pipeline } from '../src/index.js';

type RequestCtxType = {
  'elapsed'?: number;
  'headers': Record<string, string>;
  'url': string;
};

class TimedPipeline extends Pipeline<RequestCtxType> {
  private startTime = 0;

  protected override onRunStart(ctx: RequestCtxType): RequestCtxType {
    this.startTime = Date.now();
    return ctx;
  }

  protected override onRunComplete(ctx: RequestCtxType): RequestCtxType {
    return { ...ctx, 'elapsed': Date.now() - this.startTime };
  }
}

const pipeline = TimedPipeline.create<RequestCtxType>();

// Stage: attach an Authorization header
pipeline.add((ctx) => { return {
  ...ctx,
  'headers': { ...ctx.headers, 'Authorization': 'Bearer token-abc' }
}; });

const result = await pipeline.run({ 'headers': {}, 'url': '/api/data' });

console.log(`url:           ${result.url}`);
console.log(`Authorization: ${result.headers.Authorization}`);
console.log(`elapsed:       ${result.elapsed}ms`);
// #endregion usage

assert.ok(
  result.headers.Authorization !== undefined,
  'Authorization header must be set'
);
assert.ok(
  result.elapsed !== undefined && result.elapsed >= 0,
  `elapsed must be a non-negative number, got ${result.elapsed}`
);

console.log('subclass-hooks: all assertions passed');
