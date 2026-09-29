import type { Coalesce } from '@studnicky/concurrency/browser';
import type { CoalesceOptionsEntity } from '@studnicky/concurrency/entities';

import type { MutexCreateOptionsInterface } from '../../interfaces/MutexCreateOptionsInterface.js';
import type { Mutex } from '../../mutex/Mutex.js';

/** Composition configuration for `KeyedWorkGate.create()`. */
export interface KeyedWorkGateConfigInterface<
  K extends PropertyKey = string
> {
  /** Pre-built `Coalesce` instance, or config forwarded to `Coalesce.create()`. Defaults to `Coalesce.create()`. */
  'coalesce'?: Coalesce<unknown> | CoalesceOptionsEntity.InputType;
  /** Pre-built `Mutex` instance, or config forwarded to `Mutex.create()`. Defaults to `Mutex.create()`. */
  'mutex'?: Mutex<K> | MutexCreateOptionsInterface;
}
