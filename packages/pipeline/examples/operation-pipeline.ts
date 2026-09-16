/** operation-pipeline — run an operation through ordered policies. Run: npx tsx packages/pipeline/examples/operation-pipeline.ts */

import assert from 'node:assert/strict';

import { OperationPipeline } from '../src/index.js';
import { HookRequestContextEntity } from './entities/HookRequestContextEntity.js';

// #region usage
const pipeline = OperationPipeline.create<HookRequestContextEntity.Type>([
  async (context, next) => {
    console.log(`starting ${context.url}`);
    const result = await next(context);
    console.log(`completed ${context.url}`);
    return result;
  }
]);

const result = await pipeline.run(HookRequestContextEntity.create({
  'headers': {},
  'url': 'request-42'
}), (context) => {
  return `handled ${context.url}`;
});
// #endregion usage

assert.strictEqual(result, 'handled request-42');
console.log('operation-pipeline: all assertions passed');
