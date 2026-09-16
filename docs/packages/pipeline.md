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

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Runtime imports

Import `Pipeline` and `OperationPipeline` from `@studnicky/pipeline/node` in Node or `@studnicky/pipeline/browser` in browsers. Import type contracts from `@studnicky/pipeline/interfaces`.

## Usage

Construct a `Pipeline<T>` instance with a fixed array of stages, and run a context
through all of them with `run()`. Each stage receives the context and returns a
(possibly transformed) copy. The stage list is fixed at construction — a different
composition is a different `Pipeline.create()` call with a different array:

<<< ../../packages/pipeline/examples/basic-pipeline.ts#usage

## Try it

The basic demo constructs a `Pipeline` directly with `Pipeline.create<RequestCtx>([...stages])`. Each stage receives the transformed context from the previous one.

<RunnableExample src="packages/pipeline/examples/basic-pipeline" title="Pipeline stages" />

The hooks demo subclasses `Pipeline` and overrides all eight protected hooks. The failing run emits `stageError` and `runError` with the exact stage error, then rejects with that same value.

<RunnableExample src="packages/pipeline/examples/observedPipeline" title="Pipeline lifecycle hooks" />

## Public API

Use the runtime entry point for the active platform and import type contracts from `@studnicky/pipeline/interfaces`.

## Run an operation through policies

Use `OperationPipeline<TContext>` when a policy surrounds a supplied operation. Interceptors receive the context and `next(context)`. The first declared interceptor enters first, each interceptor decides when to call `next`, each `run()` call chooses its own result type, and the operation result or thrown value passes through unchanged:

<<< ../../packages/pipeline/examples/operation-pipeline.ts#usage

<RunnableExample src="packages/pipeline/examples/operation-pipeline" title="Operation policies" />

## Extending

`beforeStage` and `afterStage` are the transform hooks. Each returns the context passed to the adjacent stage, and an error from either rejects the run. The six lifecycle hooks are observers: `onRunStart`, `onStageStart`, `onStageSuccess`, `onStageError`, `onRunError`, and `onRunComplete`. They receive a detached, deeply frozen context snapshot when context is available and may return `void` or a promise; their return values are ignored, and a throw, rejection, unresolved promise, or snapshot failure never delays, replaces, or changes a stage or run outcome. A context that cannot be cloned skips only that observer while the pipeline continues.

<<< ../../packages/pipeline/examples/subclass-hooks.ts#usage

The `stages` getter returns a readonly snapshot of all constructed transforms, useful for inspection or tooling.

## Observability hooks

| Hook | When it fires | Args |
|------|---------------|------|
| `onRunStart(ctx)` | Before the first stage. | `ctx: Readonly<T>` |
| `beforeStage(ctx, index)` | Before each stage; return value becomes the stage input. | `ctx: T`, `index: number` |
| `onStageStart(index, ctx)` | After `beforeStage`, before the stage. | `index: number`, `ctx: Readonly<T>` |
| `onStageSuccess(index, ctx)` | After a stage succeeds, before `afterStage`. | `index: number`, `ctx: Readonly<T>` |
| `afterStage(ctx, index)` | After each stage; return value becomes the next context. | `ctx: T`, `index: number` |
| `onStageError(index, error)` | When a stage throws, before the same value propagates. | `index: number`, `error: unknown` |
| `onRunError(error)` | When a stage error propagates out of `run()`, after `onStageError`. | `error: unknown` |
| `onRunComplete(ctx)` | After all stages complete. | `ctx: Readonly<T>` |

<<< ../../packages/pipeline/examples/observedPipeline.ts#usage

## Interfaces

`@studnicky/pipeline/interfaces` exports pipeline stage, operation, interceptor, and injectable operation-pipeline contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type {
  OperationFunctionInterface,
  OperationInterceptorInterface,
  OperationPipelineInterface,
  PipelineFunctionInterface
} from '@studnicky/pipeline/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `OperationPipeline` | Runs a supplied operation through typed interceptors. | `@studnicky/pipeline/node` |
| `OperationPipelineInterface` | Injectable operation-policy contract. | `@studnicky/pipeline/interfaces` |
| `Pipeline` | Runs typed transformation stages in sequence. | `@studnicky/pipeline/node` |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/pipeline)
