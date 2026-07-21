import type { CpuInfoEntity } from './entities/CpuInfoEntity.js';
import type { GpuInfoEntity } from './entities/GpuInfoEntity.js';
import type { MemoryInfoEntity } from './entities/MemoryInfoEntity.js';
import type { PlatformInfoEntity } from './entities/PlatformInfoEntity.js';

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
    if (System.#gpuCache === undefined) {
      const detected = PROVIDER.detectGpu();
      System.#gpuCache = detected;
    }

    const cached = System.#gpuCache;
    return cached === null ? null : { ...cached };
  }

  static get optimalWorkerCount(): number {
    const result = Math.max(1, PROVIDER.logicalCpuCount() - 1);
    return result;
  }

  static #isAppleSilicon(platformStr: string): boolean {
    const arch = PROVIDER.arch();
    return platformStr === 'darwin' && arch === 'arm64';
  }

}
