import type { WebLockOptionsEntity } from '../entities/WebLockOptionsEntity.js';
import type { WebLockManagerInterface } from './WebLockManagerInterface.js';

/** Options for acquiring a native browser lock. */
export interface WebLockCreateOptionsInterface extends WebLockOptionsEntity.Type {
  readonly 'lockManager'?: WebLockManagerInterface;
}
