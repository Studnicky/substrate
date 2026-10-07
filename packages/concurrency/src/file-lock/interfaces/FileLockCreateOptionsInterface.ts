
import type { ClockProviderInterface, FileSystemInterface, SchedulerProviderInterface } from '#runtime';

import type { FileLockOptionsEntity } from '../entities/FileLockOptionsEntity.js';
import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

/** Dependencies, timing, and target path used by `FileLock.create()`. */
export interface FileLockCreateOptionsInterface {
  /** Clock used to measure acquisition deadlines. Default: real-time clock. */
  readonly 'clock'?: ClockProviderInterface;
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'ownerToken'?: OwnerTokenInterface;
  readonly 'path': FileLockOptionsEntity.InputType['path'];
  readonly 'pollMs'?: FileLockOptionsEntity.InputType['pollMs'];
  /** Scheduler used to defer contended acquisition attempts. Default: real-time scheduler. */
  readonly 'scheduler'?: SchedulerProviderInterface;
  readonly 'timeoutMs'?: FileLockOptionsEntity.InputType['timeoutMs'];
}
