import type { FireOnAbortStartEffectEntity } from '../entities/FireOnAbortStartEffectEntity.js';
import type { FireOnAcquireEffectEntity } from '../entities/FireOnAcquireEffectEntity.js';
import type { FireOnAcquireWaitEffectEntity } from '../entities/FireOnAcquireWaitEffectEntity.js';
import type { FireOnAdaptiveAdjustEffectEntity } from '../entities/FireOnAdaptiveAdjustEffectEntity.js';
import type { FireOnContendedEffectEntity } from '../entities/FireOnContendedEffectEntity.js';
import type { FireOnDrainCompleteEffectEntity } from '../entities/FireOnDrainCompleteEffectEntity.js';
import type { FireOnDrainStartEffectEntity } from '../entities/FireOnDrainStartEffectEntity.js';
import type { FireOnRejectEffectEntity } from '../entities/FireOnRejectEffectEntity.js';
import type { FireOnReleaseEffectEntity } from '../entities/FireOnReleaseEffectEntity.js';
import type { FireOnWindowSlideEffectEntity } from '../entities/FireOnWindowSlideEffectEntity.js';
import type { NonNegativeCountEntity } from '../entities/NonNegativeCountEntity.js';

/**
 * One hook-firing instruction. `Throttle` interprets each variant into exactly one
 * `hooks.invoke`/`invokeAsync` call. `OperationLifecycleMachine`/`Throttle` reference the
 * full ten-variant union inline at each use site — mirroring `CircuitBreakerMachine` — rather
 * than through a named union alias, since a type alias over a union of contract interfaces has
 * no schema-derived remedy (`FireOnRejectEffectInterface` carries a real `Error`, which is not
 * JSON-representable). The ten variants live as members of this one namespace, rather than as
 * ten separate files under `interfaces/`, so this file — the historical single source of truth
 * for `OperationLifecycleMachine`'s effect shapes — can keep exporting exactly one symbol.
 */
export namespace OperationLifecycleEffect {
  export interface FireOnAcquireEffectInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnAcquireEffectEntity.Type['variant'];
  }

  export interface FireOnContendedEffectInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnContendedEffectEntity.Type['variant'];
  }

  export interface FireOnAcquireWaitEffectInterface {
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnAcquireWaitEffectEntity.Type['variant'];
  }

  export interface FireOnWindowSlideEffectInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnWindowSlideEffectEntity.Type['variant'];
  }

  export interface FireOnRejectEffectInterface {
    readonly 'reason': Error;
    readonly 'variant': FireOnRejectEffectEntity.Type['variant'];
  }

  export interface FireOnAdaptiveAdjustEffectInterface {
    readonly 'newLimit': NonNegativeCountEntity.Type['count'];
    readonly 'previousLimit': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnAdaptiveAdjustEffectEntity.Type['variant'];
  }

  export interface FireOnDrainStartEffectInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnDrainStartEffectEntity.Type['variant'];
  }

  export interface FireOnDrainCompleteEffectInterface {
    readonly 'totalExecuted': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnDrainCompleteEffectEntity.Type['variant'];
  }

  export interface FireOnAbortStartEffectInterface {
    readonly 'cancelledCount': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnAbortStartEffectEntity.Type['variant'];
  }

  export interface FireOnReleaseEffectInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'totalExecuted': NonNegativeCountEntity.Type['count'];
    readonly 'variant': FireOnReleaseEffectEntity.Type['variant'];
  }
}
