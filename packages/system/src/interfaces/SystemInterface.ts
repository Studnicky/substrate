import type { CpuInfoEntity } from '../entities/CpuInfoEntity.js';
import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';
import type { MemoryInfoEntity } from '../entities/MemoryInfoEntity.js';
import type { PlatformInfoEntity } from '../entities/PlatformInfoEntity.js';

/** Portable runtime facts provided by Node and browser adapters. */
export interface SystemInterface {
  readonly 'cpu': CpuInfoEntity.Type;
  'gpu': () => GpuInfoEntity.Type | null;
  readonly 'memory': MemoryInfoEntity.Type;
  readonly 'optimalWorkerCount': number;
  readonly 'platform': PlatformInfoEntity.Type;
}
