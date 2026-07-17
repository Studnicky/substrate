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
    const arch = PROVIDER.arch();
    const { logicalCount, model, physicalCount } = PROVIDER.cpuInfo();

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

    return {
      'isAppleSilicon': System.#isAppleSilicon(platformStr),
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
    return System.#isAppleSilicon(platformStr);
  }

  static #isAppleSilicon(platformStr: string): boolean {
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
