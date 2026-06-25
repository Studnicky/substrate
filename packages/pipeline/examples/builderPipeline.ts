/**
 * builderPipeline — constructs a Pipeline via Pipeline.builder().build(),
 * registers stages with add(), and runs a context through all stages.
 * Run: npx tsx examples/builderPipeline.ts
 */

import assert from 'node:assert/strict';

// #region usage
import { Pipeline } from '../src/index.js';

type RequestCtx = {
  'body': string;
  'headers': Record<string, string>;
  'status': number;
};

// Build a pipeline using the fluent builder
const pipeline = Pipeline.builder<RequestCtx>().build();

console.log('Pipeline built. Stages:', pipeline.stages.length);

// Stage 0: set initial status
pipeline.add((ctx) => { return { ...ctx, 'status': 200 }; });

// Stage 1: attach a request-id header
pipeline.add((ctx) => { return { ...ctx, 'headers': { ...ctx.headers, 'x-request-id': 'abc-123' } }; });

// Stage 2: append a signed footer to the body
pipeline.add((ctx) => { return { ...ctx, 'body': `${ctx.body} [signed]` }; });

console.log('Stages registered:', pipeline.stages.length);

const result = await pipeline.run({ 'body': 'Hello', 'headers': {}, 'status': 0 });
console.log('Status:', result.status);
console.log('Headers:', result.headers);
console.log('Body:', result.body);
// #endregion usage

assert.equal(result.status, 200, 'Status stage applied');
assert.equal(result.headers['x-request-id'], 'abc-123', 'Request-id header injected');
assert.equal(result.body, 'Hello [signed]', 'Body stage applied');

console.log('builderPipeline: all assertions passed');
