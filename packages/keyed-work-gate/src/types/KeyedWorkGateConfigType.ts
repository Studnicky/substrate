/** Composition configuration for `KeyedWorkGate.create()`/`.builder()`. */

import type { Coalesce, CoalesceOptionsType } from '@studnicky/concurrency';
import type { Mutex, MutexConfigEntity } from '@studnicky/mutex';

export type KeyedWorkGateConfigType<K extends PropertyKey = string> = {
  /** Pre-built `Coalesce` instance, or config forwarded to `Coalesce.create()`. Defaults to `Coalesce.create()`. */
  'coalesce'?: Coalesce<unknown> | CoalesceOptionsType;
  /** Pre-built `Mutex` instance, or config forwarded to `Mutex.create()`. Defaults to `Mutex.create()`. */
  'mutex'?: Mutex<K> | Partial<MutexConfigEntity.Type>;
};
