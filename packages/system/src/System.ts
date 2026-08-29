import { RuntimeError } from '@studnicky/errors';

import type { CpuInfoEntity } from './entities/CpuInfoEntity.js';
import type { GpuCacheComputedNoneStateEntity } from './entities/GpuCacheComputedNoneStateEntity.js';
import type { GpuCacheComputedValueStateEntity } from './entities/GpuCacheComputedValueStateEntity.js';
import type { GpuCacheUncomputedStateEntity } from './entities/GpuCacheUncomputedStateEntity.js';
import type { GpuInfoEntity } from './entities/GpuInfoEntity.js';
import type { MemoryInfoEntity } from './entities/MemoryInfoEntity.js';
import type { PlatformInfoEntity } from './entities/PlatformInfoEntity.js';

import { GPU_CACHE_MACHINE } from './GPU_CACHE_MACHINE.js';
import { SystemProvider } from './providers/SystemProvider.js';

const PROVIDER = new SystemProvider();

export class System {
  static #gpuState: GpuCacheUncomputedStateEntity.Type | GpuCacheComputedNoneStateEntity.Type | GpuCacheComputedValueStateEntity.Type
    = GPU_CACHE_MACHINE.getInitialState();

  private constructor() {
    throw RuntimeError.create('System is a static-only class');
  }

  static get cpu(): CpuInfoEntity.Type {
    const arch = PROVIDER.arch();
    const { logicalCount, model, physicalCount } = PROVIDER.cpuInfo();

    const result: CpuInfoEntity.Type = {
      'arch': arch,
      'logicalCount': logicalCount,
      'model': model,
      'physicalCount': physicalCount
    };
    return result;
  }

  static get memory(): MemoryInfoEntity.Type {
    const result: MemoryInfoEntity.Type = {
      'freeMb': PROVIDER.freeMb(),
      'totalMb': PROVIDER.totalMb()
    };
    return result;
  }

  static get platform(): PlatformInfoEntity.Type {
    const platformString = PROVIDER.platform();

    const result: PlatformInfoEntity.Type = {
      'isAppleSilicon': platformString === 'darwin' && PROVIDER.arch() === 'arm64',
      'nodeVersion': PROVIDER.runtimeVersion(),
      'os': platformString
    };
    return result;
  }

  static gpu(): GpuInfoEntity.Type | null {
    if (System.#gpuState.variant === 'uncomputed') {
      const detected = PROVIDER.detectGpu();
      System.#gpuState = GPU_CACHE_MACHINE.transition(System.#gpuState, { 'detected': detected, 'type': 'computed' }).state;
    }

    const result: GpuInfoEntity.Type | null = System.#gpuState.variant === 'computed-value' ? { ...System.#gpuState.gpu } : null;
    return result;
  }

  static get optimalWorkerCount(): number {
    const remainingWorkerCount = PROVIDER.logicalCpuCount() - 1;
    const result = Math.max(1, remainingWorkerCount);
    return result;
  }

}
