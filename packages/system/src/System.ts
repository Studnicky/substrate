import type { CpuInfoEntity } from './entities/CpuInfoEntity.js';
import type { GpuInfoEntity } from './entities/GpuInfoEntity.js';
import type { MemoryInfoEntity } from './entities/MemoryInfoEntity.js';
import type { PlatformInfoEntity } from './entities/PlatformInfoEntity.js';
import type { SystemInfoEntity } from './entities/SystemInfoEntity.js';

import { SystemProvider } from './providers/SystemProvider.js';

const PROVIDER = new SystemProvider();

export class System {
  static #gpuCache: GpuInfoEntity.Type | null | undefined = undefined;

  private constructor() {
    throw new Error('System is a static-only class');
  }

  static get cpu(): CpuInfoEntity.Type {
    const logicalCount = PROVIDER.logicalCpuCount();
    const model = PROVIDER.cpuModel();
    const arch = PROVIDER.arch();
    const hasHyperthreading = arch !== 'arm64';
    const physicalCount = hasHyperthreading
      ? Math.max(1, Math.round(logicalCount / 2))
      : logicalCount;

    return {
      'arch': arch,
      'logicalCount': logicalCount,
      'model': model,
      'physicalCount': physicalCount
    };
  }

  static get memory(): MemoryInfoEntity.Type {
    return {
      'freeMb': PROVIDER.freeMb(),
      'totalMb': PROVIDER.totalMb()
    };
  }

  static get platform(): PlatformInfoEntity.Type {
    const platformStr = PROVIDER.platform();
    const arch = PROVIDER.arch();

    return {
      'isAppleSilicon': platformStr === 'darwin' && arch === 'arm64',
      'nodeVersion': PROVIDER.runtimeVersion(),
      'os': platformStr
    };
  }

  static gpu(): GpuInfoEntity.Type | null {
    if (System.#gpuCache !== undefined) {
      return System.#gpuCache;
    }

    const detected = PROVIDER.detectGpu();
    System.#gpuCache = detected;

    return System.#gpuCache;
  }

  static get logicalCpuCount(): number {
    const result = PROVIDER.logicalCpuCount();
    return result;
  }

  static get optimalWorkerCount(): number {
    const result = Math.max(1, PROVIDER.logicalCpuCount() - 1);
    return result;
  }

  static get isAppleSilicon(): boolean {
    const platformStr = PROVIDER.platform();
    const arch = PROVIDER.arch();
    return platformStr === 'darwin' && arch === 'arm64';
  }

  static snapshot(): SystemInfoEntity.Type {
    const gpu = System.gpu();

    return {
      'cpu': System.cpu,
      'gpu': gpu,
      'memory': System.memory,
      'platform': System.platform
    };
  }
}
