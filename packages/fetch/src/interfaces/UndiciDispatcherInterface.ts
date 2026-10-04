import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { DispatcherHealthEntity } from '../entities/DispatcherHealthEntity.js';
import type { SocketDispatcherStatsEntity } from '../entities/SocketDispatcherStatsEntity.js';

/**
 * Interface for undici dispatcher
 */
export interface UndiciDispatcherInterface {
  checkDispatcherHealth(origin: string): DispatcherHealthEntity.Type;
  close(): Promise<void>;
  destroy(options?: DestroyOptionsEntity.InputType): Promise<void>;
  getStats(): ReadonlyMap<string, Readonly<SocketDispatcherStatsEntity.Type>>;
}
