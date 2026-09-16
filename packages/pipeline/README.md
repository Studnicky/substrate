# @studnicky/pipeline

> Generic typed async pipeline for sequential context transforms

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/pipeline)

`@studnicky/pipeline` provides `Pipeline<T>`, a generic typed async pipeline that runs a context value through an ordered list of transform functions, passing each stage's output as the next stage's input. Construct instances via `Pipeline.create<T>(stages)` with a fixed array of stage functions — the stage list is set once at construction and does not change.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/pipeline
```

## Runtime imports

Import runtime APIs from `@studnicky/pipeline/node` in Node or `@studnicky/pipeline/browser` in browsers. Import pipeline contracts from `@studnicky/pipeline/interfaces`.

## Usage

```typescript
import { Pipeline } from '@studnicky/pipeline/node';
import type { PipelineFunctionInterface } from '@studnicky/pipeline/interfaces';
import type { OrderContextEntity } from './entities/OrderContextEntity.js';

// Stages — each receives the previous stage's output
const calculateTotal: PipelineFunctionInterface<OrderContextEntity.Type> = (ctx) => ({
  ...ctx,
  total: ctx.items.length * 10
});

const pipeline = Pipeline.create<OrderContextEntity.Type>([
  calculateTotal,
  (ctx) => ({ ...ctx, discount: ctx.total > 20 ? 5 : 0 }),
  (ctx) => ({ ...ctx, total: ctx.total - ctx.discount })
]);

const result = await pipeline.run({ items: ['a', 'b', 'c'], total: 0, discount: 0 });
// result.total === 25 (3 items × 10 = 30, discount 5, total 25)
```

## Wrap an operation

Use `OperationPipeline<TContext>` when a policy needs to run before and after a supplied operation. Policies are entered in declaration order and call `next(context)` to continue. Each `run()` call supplies its own result type. The final operation result and any thrown value pass through unchanged.

```typescript
import { OperationPipeline } from '@studnicky/pipeline/node';
import type {
  OperationInterceptorInterface,
  OperationPipelineInterface
} from '@studnicky/pipeline/interfaces';

interface RequestContext { requestId: string }

const audit: OperationInterceptorInterface<RequestContext> = async (context, next) => {
  console.log(`starting ${context.requestId}`);
  const result = await next(context);
  console.log(`completed ${context.requestId}`);
  return result;
};

const pipeline: OperationPipelineInterface<RequestContext> =
  OperationPipeline.create<RequestContext>([audit]);
const result = await pipeline.run({ requestId: 'request-42' }, async (context) => `handled ${context.requestId}`);
```

## Extending

`beforeStage` and `afterStage` are transform hooks: each returns the context passed to the adjacent stage, and a thrown error rejects the run. Every lifecycle hook is an observer: `onRunStart`, `onStageStart`, `onStageSuccess`, `onStageError`, `onRunError`, and `onRunComplete` may return `void` or a promise. Hooks that receive context receive a detached, deeply frozen snapshot. Their return values are ignored; a throw, rejection, unresolved promise, or snapshot failure never delays, replaces, or changes the stage or run outcome. A context that cannot be cloned skips that observer while the pipeline continues.

```typescript
import { Pipeline } from '@studnicky/pipeline/node';
import type { AuditContextEntity } from './entities/AuditContextEntity.js';

class AuditPipeline extends Pipeline<AuditContextEntity.Type> {
  protected override beforeStage(context: AuditContextEntity.Type): AuditContextEntity.Type {
    return { ...context, timestamp: Date.now() };
  }

  protected override onRunComplete(context: Readonly<AuditContextEntity.Type>): void {
    console.log(`[audit] ${context.action} by ${context.userId} at ${context.timestamp}`);
  }
}

const pipeline = AuditPipeline.create<AuditContextEntity.Type>([
  async (context) => context
]);

const result = await pipeline.run({ userId: 'u1', action: 'login' });
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/pipeline

## License

MIT
