---
title: '@studnicky/throttle'
description: Limit concurrent asynchronous operations with queue, drain, and abort controls.
---

# @studnicky/throttle

> Limit concurrent asynchronous operations with a configurable sliding window.

## Install

```bash
pnpm add @studnicky/throttle
```

## Usage

Create a `Throttle` with its concurrency settings, then pass asynchronous operations to `execute`.

<<< ../../packages/throttle/examples/basicThrottle.ts#usage

## Drain and abort

Call `drain()` to finish active and queued operations before accepting no more work. Call `abort()` to cancel queued work and resolve active calls with `undefined` while their callbacks finish in the background.

<<< ../../packages/throttle/examples/drainThrottle.ts#usage

## Observe a throttle

Subclass `Throttle` to collect acquisition, queueing, release, drain, abort, and adaptive-limit events.

<RunnableExample src="packages/throttle/examples/observedThrottle" title="Observed throttle lifecycle" />

## Imports

Import runtime APIs from `@studnicky/throttle/node` or `@studnicky/throttle/browser`, entities from `@studnicky/throttle/entities`, and interfaces from `@studnicky/throttle/interfaces`.

## Entities

<!-- inline-ts-ok: published import path -->
```typescript
import { ThrottleConfigEntity } from '@studnicky/throttle/entities';
```

## Interfaces

<!-- inline-ts-ok: published import path -->
```typescript
import type { ThrottleInterface } from '@studnicky/throttle/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `Throttle` | Limits concurrent asynchronous work. | `@studnicky/throttle/node` |
| `ThrottleInterface` | Defines the throttle contract. | `@studnicky/throttle/interfaces` |
| `ThrottleAbortedError` | Represents cancelled work. | `@studnicky/throttle/node` |
| `ThrottleDrainingError` | Represents work rejected during draining. | `@studnicky/throttle/node` |
