---
title: '@studnicky/pipeline'
description: Generic typed async pipeline for sequential context transforms.
---

# @studnicky/pipeline

> Generic typed async pipeline for sequential context transforms.

## Install

```bash
pnpm add @studnicky/pipeline
```

## Usage

```typescript
import { Pipeline } from '@studnicky/pipeline';

interface RequestCtx {
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

const pipeline = new Pipeline<RequestCtx>();

// Add transforms — each receives and returns the context
const removeAuth = pipeline.add(async (ctx) => ({
  ...ctx,
  headers: { ...ctx.headers, Authorization: `Bearer ${getToken()}` }
}));

const removeLogging = pipeline.add(async (ctx) => {
  console.log(`[pipeline] ${ctx.url}`);
  return ctx;
});

// Run the pipeline
const result = await pipeline.run({ url: '/api/data', headers: {} });

// Remove a stage when no longer needed
removeAuth();
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/pipeline` | `Pipeline` |
| `@studnicky/pipeline/interfaces` | `PipelineInterface` |
| `@studnicky/pipeline/pipeline` | `Pipeline` (direct subpath) |
| `@studnicky/pipeline/types` | `PipelineFnType` |

## Extending

`Pipeline` exposes four protected hooks — `onRunStart`, `beforeStage`, `afterStage`, and `onRunComplete`:

```typescript
import { Pipeline } from '@studnicky/pipeline';

class TimedPipeline<T> extends Pipeline<T> {
  private startMs = 0;

  protected override onRunStart(ctx: T): T {
    this.startMs = Date.now();
    return ctx;
  }

  protected override onRunComplete(ctx: T): T {
    metrics.timing('pipeline.duration', Date.now() - this.startMs);
    return ctx;
  }
}
```

The `stages` getter exposes a readonly view of all registered transforms, useful for inspection or tooling.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/pipeline)
