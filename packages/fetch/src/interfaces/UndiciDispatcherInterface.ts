import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { DispatcherHealthEntity } from '../entities/DispatcherHealthEntity.js';

/**
 * Interface for undici dispatcher
 */
export interface UndiciDispatcherInterface {
  checkDispatcherHealth(origin: string): DispatcherHealthEntity.Type;
  close(): Promise<void>;
  destroy(options?: DestroyOptionsEntity.Type): Promise<void>;
  getStats(): Readonly<Record<string, unknown>>;
}
