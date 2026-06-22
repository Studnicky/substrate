import os from 'node:os';

import { GpuDetector } from './modules/GpuDetector.js';
import type { CpuInfoType } from './types/CpuInfoType.js';
import type { GpuInfoType } from './types/GpuInfoType.js';
import type { MemoryInfoType } from './types/MemoryInfoType.js';
import type { PlatformInfoType } from './types/PlatformInfoType.js';
import type { SystemInfoType } from './types/SystemInfoType.js';

const BYTES_PER_MB = 1024 * 1024;

let gpuCache: GpuInfoType | null | undefined = undefined;

export class System {
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

    return { arch, logicalCount, model, physicalCount };
  }

  static get memory(): MemoryInfoType {
    return {
      freeMb: Math.floor(os.freemem() / BYTES_PER_MB),
      totalMb: Math.floor(os.totalmem() / BYTES_PER_MB)
    };
  }

  static get platform(): PlatformInfoType {
    const platformStr = os.platform();
    const arch = os.arch();

    return {
      isAppleSilicon: platformStr === 'darwin' && arch === 'arm64',
      nodeVersion: process.version,
      os: platformStr
    };
  }

  static async gpu(): Promise<GpuInfoType | null> {
    if (gpuCache !== undefined) {
      return gpuCache;
    }

    const detected = GpuDetector.detect();
    gpuCache = detected;

    return gpuCache;
  }

  static get logicalCpuCount(): number {
    return System.cpu.logicalCount;
  }

  static get optimalWorkerCount(): number {
    return Math.max(1, System.logicalCpuCount - 1);
  }

  static get isAppleSilicon(): boolean {
    return System.platform.isAppleSilicon;
  }

  static async snapshot(): Promise<SystemInfoType> {
    const gpu = await System.gpu();

    return {
      cpu: System.cpu,
      gpu,
      memory: System.memory,
      platform: System.platform
    };
  }
}
