import os from 'node:os';

import type { CpuInfoType } from './types/CpuInfoType.js';
import type { GpuInfoType } from './types/GpuInfoType.js';
import type { MemoryInfoType } from './types/MemoryInfoType.js';
import type { PlatformInfoType } from './types/PlatformInfoType.js';
import type { SystemInfoType } from './types/SystemInfoType.js';

import { GpuDetector } from './modules/GpuDetector.js';

const BYTES_PER_MB = 1024 * 1024;

export class System {
  static #gpuCache: GpuInfoType | null | undefined = undefined;

  private constructor() {
    throw new Error('System is a static-only class');
  }

  static get cpu(): CpuInfoType {
    const cpus = os.cpus();
    const logicalCount = cpus.length;
    const firstCpu = cpus[0];
    const model = firstCpu !== undefined ? firstCpu.model : 'Unknown';

    // Heuristic: assume hyperthreading halves physical count on x86,
    // Apple Silicon does not use hyperthreading.
    const arch = os.arch();
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
      'freeMb': Math.floor(os.freemem() / BYTES_PER_MB),
      'totalMb': Math.floor(os.totalmem() / BYTES_PER_MB)
    };
  }

  static get platform(): PlatformInfoType {
    const platformStr = os.platform();
    const arch = os.arch();

    return {
      'isAppleSilicon': platformStr === 'darwin' && arch === 'arm64',
      'nodeVersion': process.version,
      'os': platformStr
    };
  }

  static gpu(): GpuInfoType | null {
    if (System.#gpuCache !== undefined) {
      return System.#gpuCache;
    }

    const detected = GpuDetector.detect();
    System.#gpuCache = detected;

    return System.#gpuCache;
  }

  static get logicalCpuCount(): number {
    const cpus = os.cpus();
    return cpus.length;
  }

  static get optimalWorkerCount(): number {
    const cpus = os.cpus();
    return Math.max(1, cpus.length - 1);
  }

  static get isAppleSilicon(): boolean {
    const platformStr = os.platform();
    const arch = os.arch();
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
