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

Build a `Pipeline<T>` instance, register stages with `add()`, and run a context
through all of them with `run()`. Each stage receives the context and returns a
(possibly transformed) copy. `add()` returns a removal function:

<<< ../../packages/pipeline/examples/basic-pipeline.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/pipeline` | `Pipeline`, `PipelineError` |
| `@studnicky/pipeline/interfaces` | `PipelineInterface` |
| `@studnicky/pipeline/pipeline` | `Pipeline` (direct subpath) |
| `@studnicky/pipeline/types` | `PipelineFnType` |

## Extending

`Pipeline` exposes four protected hooks — `onRunStart`, `beforeStage`, `afterStage`,
and `onRunComplete` — that subclasses can override to inject timing, logging, or
context mutation without coupling the core pipeline to any external dependency:

<<< ../../packages/pipeline/examples/subclass-hooks.ts#usage

The `stages` getter exposes a readonly view of all registered transforms, useful
for inspection or tooling.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/pipeline)
