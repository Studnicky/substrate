import type { Coalesce, CoalesceOptionsEntity } from '@studnicky/concurrency';
import type { Mutex, MutexConfigEntity } from '@studnicky/mutex';

/** Composition configuration for `KeyedWorkGate.create()`. */
export interface KeyedWorkGateConfigInterface<
  K extends PropertyKey = string
> {
  /** Pre-built `Coalesce` instance, or config forwarded to `Coalesce.create()`. Defaults to `Coalesce.create()`. */
  'coalesce'?: Coalesce<unknown> | CoalesceOptionsEntity.Type;
  /** Pre-built `Mutex` instance, or config forwarded to `Mutex.create()`. Defaults to `Mutex.create()`. */
  'mutex'?: Mutex<K> | Partial<MutexConfigEntity.Type>;
}
