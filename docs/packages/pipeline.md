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

## Usage

Construct a `Pipeline<T>` instance with a fixed array of stages, and run a context
through all of them with `run()`. Each stage receives the context and returns a
(possibly transformed) copy. The stage list is fixed at construction — a different
composition is a different `Pipeline.create()` call with a different array:

<<< ../../packages/pipeline/examples/basic-pipeline.ts#usage

## Try it

The basic demo constructs a `Pipeline` directly with `Pipeline.create<RequestCtx>([...stages])`. Each stage receives the transformed context from the previous one.

<RunnableExample src="packages/pipeline/examples/basic-pipeline" title="Pipeline stages" />

The hooks demo subclasses `Pipeline` and overrides all eight protected lifecycle hooks, then runs both a happy path and a failing path. Watch the happy path emit `runStart → beforeStage → stageStart → stageSuccess → afterStage` for each of three stages, then `runComplete`. The failing path shows `stageError` at index 1 followed by `runError` wrapping the stage failure in a `PipelineError`.

<RunnableExample src="packages/pipeline/examples/observedPipeline" title="Pipeline lifecycle hooks" />

## Public API

Import `Pipeline`, `PipelineError`, `PipelineOptionsEntity`, `PipelineFunctionInterface`, and `PipelineInterface` from `@studnicky/pipeline`.

## Extending

`Pipeline` exposes four protected hooks (`onRunStart`, `beforeStage`, `afterStage`,
and `onRunComplete`) that subclasses can override to inject timing, logging, or
context mutation without coupling the core pipeline to any external dependency:

<<< ../../packages/pipeline/examples/subclass-hooks.ts#usage

The `stages` getter returns a readonly snapshot of all constructed transforms, useful
for inspection or tooling.

## Observability hooks

`Pipeline` exposes eight protected hooks for every stage of execution. The four **transform hooks** (`onRunStart`, `beforeStage`, `afterStage`, `onRunComplete`) return `T`, stay in-band, and can transform the context or fail the run. The four **observer hooks** are void, fire at every stage boundary and error path, and are kept observational so they do not replace the stage result or canonical stage error.

| Hook | When it fires | Args |
|------|---------------|------|
| `onRunStart(ctx)` | Before the first stage; return value becomes the initial ctx | `ctx: T` |
| `beforeStage(ctx, index)` | Before each stage fn; return value is passed to the stage fn | `ctx: T`, `index: number` |
| `onStageStart(index, ctx)` | After `beforeStage`, before the stage fn — void observer | `index: number`, `ctx: T` |
| `onStageSuccess(index, ctx)` | After the stage fn succeeds, before `afterStage` — void observer | `index: number`, `ctx: T` |
| `afterStage(ctx, index)` | After each stage fn; return value becomes ctx for the next stage | `ctx: T`, `index: number` |
| `onStageError(index, error)` | When a stage fn throws, before the error is wrapped — void observer | `index: number`, `error: unknown` |
| `onRunError(error)` | When a stage error propagates out of `run()`, after `onStageError` — void observer | `error: unknown` |
| `onRunComplete(ctx)` | After all stages complete; return value is the resolved result | `ctx: T` |

<<< ../../packages/pipeline/examples/observedPipeline.ts#usage

The base class never calls any logger or metrics library. Observer hooks are no-ops by default; transform hooks are the behavioral seams.

The four observer hooks run through a composed `HookInvoker` (see [`@studnicky/errors`](/packages/errors#hookinvoker)). A throwing observer surfaces as `HookInvocationError`. Pass `hookTimeoutMs` to `Pipeline.create<T>([...stages], { hookTimeoutMs })` to bound an asynchronous observer; exceeding the bound surfaces through `HookTimeoutError`. Without `hookTimeoutMs`, hook invocation is unbounded.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/pipeline)
