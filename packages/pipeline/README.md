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

## Usage

```typescript
import { Pipeline } from '@studnicky/pipeline';
import type { PipelineFunctionInterface } from '@studnicky/pipeline';
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

## Extending

Subclass `Pipeline<T>` to observe or transform execution at any fire point. All four protected hooks have pass-through defaults — override only what you need. `onRunStart` runs once before stage 0, `beforeStage` and `afterStage` wrap each individual stage, and `onRunComplete` runs after all stages and determines the final resolved value.

```typescript
import { Pipeline } from '@studnicky/pipeline';
import type { AuditContextEntity } from './entities/AuditContextEntity.js';

class AuditPipeline extends Pipeline<AuditContextEntity.Type> {
  protected override onRunStart(
    ctx: AuditContextEntity.Type
  ): AuditContextEntity.Type {
    return { ...ctx, timestamp: Date.now() };
  }

  protected override onRunComplete(
    ctx: AuditContextEntity.Type
  ): AuditContextEntity.Type {
    console.log(`[audit] ${ctx.action} by ${ctx.userId} at ${ctx.timestamp}`);
    return ctx;
  }
}

const pipeline = AuditPipeline.create<AuditContextEntity.Type>([
  async (ctx) => {
    // stage logic
    return ctx;
  }
]);

const result = await pipeline.run({ userId: 'u1', action: 'login' });
// result.timestamp is set; audit log emitted after all stages
```

The four void observer hooks (`onStageStart`, `onStageSuccess`, `onStageError`, `onRunError`) run through a composed `HookInvoker` (see `@studnicky/errors`). Pass `hookTimeoutMs` to bound how long an async observer hook may run before it's treated as a failure — left unset, a hook may take arbitrarily long, matching prior behavior:

```typescript
const pipeline = Pipeline.create<OrderContextEntity.Type>([calculateTotal], { hookTimeoutMs: 5000 });
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/pipeline

## License

MIT
