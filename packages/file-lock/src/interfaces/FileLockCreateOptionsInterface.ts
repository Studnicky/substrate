import type { ClockProviderInterface } from '@studnicky/clock';
import type { SchedulerProviderInterface } from '@studnicky/scheduler';
import type { FileSystemInterface } from '@studnicky/virtual-fs';

import type { FileLockOptionsEntity } from '../entities/FileLockOptionsEntity.js';
import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

/** Dependencies, timing, and target path used by `FileLock.create()`. */
export interface FileLockCreateOptionsInterface {
  /** Clock used to measure acquisition deadlines. Default: real-time clock. */
  readonly 'clock'?: ClockProviderInterface;
  readonly 'fileSystem'?: FileSystemInterface;
  readonly 'ownerToken'?: OwnerTokenInterface;
  readonly 'path': FileLockOptionsEntity.Type['path'];
  readonly 'pollMs'?: FileLockOptionsEntity.Type['pollMs'];
  /** Scheduler used to defer contended acquisition attempts. Default: real-time scheduler. */
  readonly 'scheduler'?: SchedulerProviderInterface;
  readonly 'timeoutMs'?: FileLockOptionsEntity.Type['timeoutMs'];
}
