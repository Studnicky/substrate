import type { CpuInfoType } from './types/CpuInfoType.js';
import type { GpuInfoType } from './types/GpuInfoType.js';
import type { MemoryInfoType } from './types/MemoryInfoType.js';
import type { PlatformInfoType } from './types/PlatformInfoType.js';
import type { SystemInfoType } from './types/SystemInfoType.js';

import { SystemProvider } from './providers/SystemProvider.js';

const PROVIDER = new SystemProvider();

export class System {
  static #gpuCache: GpuInfoType | null | undefined = undefined;

  private constructor() {
    throw new Error('System is a static-only class');
  }

  static get cpu(): CpuInfoType {
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

  static get memory(): MemoryInfoType {
    return {
      'freeMb': PROVIDER.freeMb(),
      'totalMb': PROVIDER.totalMb()
    };
  }

  static get platform(): PlatformInfoType {
    const platformStr = PROVIDER.platform();
    const arch = PROVIDER.arch();

    return {
      'isAppleSilicon': platformStr === 'darwin' && arch === 'arm64',
      'nodeVersion': PROVIDER.runtimeVersion(),
      'os': platformStr
    };
  }

  static gpu(): GpuInfoType | null {
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

  static snapshot(): SystemInfoType {
    const gpu = System.gpu();

    return {
      'cpu': System.cpu,
      'gpu': gpu,
      'memory': System.memory,
      'platform': System.platform
    };
  }
}
