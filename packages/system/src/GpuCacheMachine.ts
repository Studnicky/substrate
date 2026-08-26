import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { GpuCacheComputedEventEntity } from './entities/GpuCacheComputedEventEntity.js';
import type { GpuCacheComputedNoneStateEntity } from './entities/GpuCacheComputedNoneStateEntity.js';
import type { GpuCacheComputedValueStateEntity } from './entities/GpuCacheComputedValueStateEntity.js';
import type { GpuCacheUncomputedStateEntity } from './entities/GpuCacheUncomputedStateEntity.js';

/**
 * Pure reducer modeling `System`'s lazy GPU-detection memoization cache as
 * an explicit three-state machine — `uncomputed` / `computed-none` /
 * `computed-value` — for consistency with every other module in this
 * monorepo that carries internal lifecycle state, now formalized on
 * `@studnicky/fsm`'s `StateMachine`. There was no bug in the old
 * `#gpuCache: GpuInfoEntity.Type | null | undefined` field; this is a
 * mechanical, behavior-preserving reshape.
 *
 * `System` is a static-only class (private constructor, throws if
 * instantiated), so there is no natural instance for a `StateMachine` to
 * live on the way `Mutex` or `CircuitBreaker` hold one per instance.
 * Restructuring `System`'s entire public API to be instantiable, just to
 * host one internal cache, would be a much larger and purely cosmetic
 * change. Instead this machine is constructed once as a module-level
 * singleton (`GPU_CACHE_MACHINE`, see `GpuCacheMachineSingleton.ts`) — a
 * static consumer for a stateless reducer is a natural fit, since
 * `StateMachine` itself holds no mutable state; only `reduce()`'s pure
 * logic. `System` keeps the *current state* (not behavior) in a static
 * private field and calls `transition()` on it exactly once per process —
 * the first `gpu()` call — the same way `Mutex` keeps per-key state in a
 * `Map` and calls `MutexKeyMachine#transition()` once per change rather
 * than holding a `MutexKeyMachine` per key.
 */
export class GpuCacheMachine extends StateMachine<
  GpuCacheUncomputedStateEntity.Type | GpuCacheComputedNoneStateEntity.Type | GpuCacheComputedValueStateEntity.Type,
  GpuCacheComputedEventEntity.Type,
  never
> {
  constructor() {
    super();
  }

  override getInitialState(): GpuCacheUncomputedStateEntity.Type {
    return { 'variant': 'uncomputed' };
  }

  override reduce(
    state: GpuCacheUncomputedStateEntity.Type | GpuCacheComputedNoneStateEntity.Type | GpuCacheComputedValueStateEntity.Type,
    event: GpuCacheComputedEventEntity.Type
  ): FsmStepInterface<
    GpuCacheUncomputedStateEntity.Type | GpuCacheComputedNoneStateEntity.Type | GpuCacheComputedValueStateEntity.Type,
    never
  > {
    if (state.variant !== 'uncomputed') {
      throw new TransitionRejectedError({
        'eventType': event.type,
        'reason': `GPU cache is write-once — cannot re-compute from '${state.variant}'`,
        'stateVariant': state.variant
      });
    }

    if (event.detected === null) {
      return { 'effects': [], 'state': { 'variant': 'computed-none' } };
    }

    return { 'effects': [], 'state': { 'gpu': event.detected, 'variant': 'computed-value' } };
  }
}
