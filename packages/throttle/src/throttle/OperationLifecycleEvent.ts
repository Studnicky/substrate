import type { AbortStartedEventEntity } from '../entities/AbortStartedEventEntity.js';
import type { AcquiredEventEntity } from '../entities/AcquiredEventEntity.js';
import type { ConcurrencyAdjustedEventEntity } from '../entities/ConcurrencyAdjustedEventEntity.js';
import type { ContendedEventEntity } from '../entities/ContendedEventEntity.js';
import type { DrainCompletedEventEntity } from '../entities/DrainCompletedEventEntity.js';
import type { DrainStartedEventEntity } from '../entities/DrainStartedEventEntity.js';
import type { NonNegativeCountEntity } from '../entities/NonNegativeCountEntity.js';
import type { OperationRejectedEventEntity } from '../entities/OperationRejectedEventEntity.js';
import type { QueuedEventEntity } from '../entities/QueuedEventEntity.js';
import type { SlotReleasedEventEntity } from '../entities/SlotReleasedEventEntity.js';
import type { SlotReleasedOutcomeEntity } from '../entities/SlotReleasedOutcomeEntity.js';
import type { WindowSlidEventEntity } from '../entities/WindowSlidEventEntity.js';

/**
 * Every kind of per-operation occurrence `Throttle` needs to react to with a lifecycle
 * hook. `SlotReleasedEventInterface.outcome` records which of the three release paths
 * produced the release (queue handoff granted to a waiter, the throttle became fully idle,
 * or the throttle is still busy with an empty queue) — retained for observability/testing
 * even though every outcome maps to the same single effect.
 *
 * `OperationLifecycleMachine`/`Throttle` reference the full ten-variant union inline at each
 * use site — mirroring `CircuitBreakerMachine` — rather than through a named union alias,
 * since a type alias over a union of contract interfaces has no schema-derived remedy
 * (`OperationRejectedEventInterface` carries a real `Error`, which is not JSON-representable).
 * The ten variants live as members of this one namespace, rather than as ten separate files
 * under `interfaces/`, so this file — the historical single source of truth for
 * `OperationLifecycleMachine`'s event shapes — can keep exporting exactly one symbol.
 */
export namespace OperationLifecycleEvent {
  export interface AcquiredEventInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'type': AcquiredEventEntity.Type['type'];
  }

  export interface ContendedEventInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'type': ContendedEventEntity.Type['type'];
  }

  export interface QueuedEventInterface {
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'type': QueuedEventEntity.Type['type'];
  }

  export interface WindowSlidEventInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'type': WindowSlidEventEntity.Type['type'];
  }

  export interface OperationRejectedEventInterface {
    readonly 'reason': Error;
    readonly 'type': OperationRejectedEventEntity.Type['type'];
  }

  export interface ConcurrencyAdjustedEventInterface {
    readonly 'newLimit': NonNegativeCountEntity.Type['count'];
    readonly 'previousLimit': NonNegativeCountEntity.Type['count'];
    readonly 'type': ConcurrencyAdjustedEventEntity.Type['type'];
  }

  export interface DrainStartedEventInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'queuedCount': NonNegativeCountEntity.Type['count'];
    readonly 'type': DrainStartedEventEntity.Type['type'];
  }

  export interface DrainCompletedEventInterface {
    readonly 'totalExecuted': NonNegativeCountEntity.Type['count'];
    readonly 'type': DrainCompletedEventEntity.Type['type'];
  }

  export interface AbortStartedEventInterface {
    readonly 'cancelledCount': NonNegativeCountEntity.Type['count'];
    readonly 'type': AbortStartedEventEntity.Type['type'];
  }

  export interface SlotReleasedEventInterface {
    readonly 'activeCount': NonNegativeCountEntity.Type['count'];
    readonly 'outcome': SlotReleasedOutcomeEntity.Type;
    readonly 'totalExecuted': NonNegativeCountEntity.Type['count'];
    readonly 'type': SlotReleasedEventEntity.Type['type'];
  }
}
