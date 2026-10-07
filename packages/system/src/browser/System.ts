import type { CpuInfoEntity } from '../entities/CpuInfoEntity.js';
import type { GpuCacheComputedNoneStateEntity } from '../entities/GpuCacheComputedNoneStateEntity.js';
import type { GpuCacheComputedValueStateEntity } from '../entities/GpuCacheComputedValueStateEntity.js';
import type { GpuCacheUncomputedStateEntity } from '../entities/GpuCacheUncomputedStateEntity.js';
import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';
import type { MemoryInfoEntity } from '../entities/MemoryInfoEntity.js';
import type { PlatformInfoEntity } from '../entities/PlatformInfoEntity.js';
import type { SystemInterface } from '../interfaces/SystemInterface.js';

import { GPU_CACHE_MACHINE } from '../GPU_CACHE_MACHINE.js';
import { SystemProvider } from '../providers/browser/SystemProvider.js';

const provider = new SystemProvider();
let gpuState: GpuCacheUncomputedStateEntity.Type
  | GpuCacheComputedNoneStateEntity.Type
  | GpuCacheComputedValueStateEntity.Type = GPU_CACHE_MACHINE.getInitialState();

export const System: SystemInterface = {
  get 'cpu'(): CpuInfoEntity.Type {
    const {
      logicalCount, model, physicalCount
    } = provider.cpuInfo();

    return {
      'arch': provider.arch(),
      'logicalCount': logicalCount,
      'model': model,
      'physicalCount': physicalCount
    };
  },

  'gpu': function(): GpuInfoEntity.Type | null {
    if (gpuState.variant === 'uncomputed') {
      const detected = provider.detectGpu();

      gpuState = GPU_CACHE_MACHINE.transition(
        gpuState,
        {
          'detected': detected, 'type': 'computed'
        }
      ).state;
    }

    const result = gpuState.variant === 'computed-value' ? { ...gpuState.gpu } : null;
    return result;
  },

  get 'memory'(): MemoryInfoEntity.Type {
    return {
      'freeMb': provider.freeMb(),
      'totalMb': provider.totalMb()
    };
  },

  'optimalWorkerCount': Math.max(1, provider.logicalCpuCount() - 1),

  get 'platform'(): PlatformInfoEntity.Type {
    const operatingSystem = provider.platform();

    return {
      'isAppleSilicon': operatingSystem === 'darwin' && provider.arch() === 'arm64',
      'os': operatingSystem
    };
  }
};
