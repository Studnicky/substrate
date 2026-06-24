import type { CpuInfoType } from './CpuInfoType.js';
import type { GpuInfoType } from './GpuInfoType.js';
import type { MemoryInfoType } from './MemoryInfoType.js';
import type { PlatformInfoType } from './PlatformInfoType.js';

export type SystemInfoType = {
  readonly 'cpu': CpuInfoType;
  readonly 'gpu': GpuInfoType | null;
  readonly 'memory': MemoryInfoType;
  readonly 'platform': PlatformInfoType;
};
