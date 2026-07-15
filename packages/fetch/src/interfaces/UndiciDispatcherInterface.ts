import type { Agent } from 'undici';

import type { DestroyOptionsType } from '../types/DestroyOptionsType.js';
import type { DispatcherHealthType } from '../types/DispatcherHealthType.js';

/**
 * Interface for undici dispatcher
 */
export interface UndiciDispatcherInterface {
  checkDispatcherHealth(origin: string): DispatcherHealthType;
  close(): Promise<void>;
  destroy(options?: DestroyOptionsType): Promise<void>;
  getAgent(): Agent;
  getSignal(): AbortSignal;
  getStats(): Readonly<Record<string, unknown>>;
}
