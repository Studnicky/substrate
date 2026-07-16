import os from 'node:os';

import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';
import type { SystemProviderInterface } from '../interfaces/SystemProviderInterface.js';

import { GpuDetector } from '../modules/GpuDetector.js';

const BYTES_PER_MB = 1024 * 1024;

export class SystemProvider implements SystemProviderInterface {
  arch(): string {
    const result = os.arch();
    return result;
  }

  cpuModel(): string {
    const result = os.cpus()[0]?.model ?? 'Unknown';
    return result;
  }

  detectGpu(): GpuInfoEntity.Type | null {
    const result = GpuDetector.detect();
    return result;
  }

  freeMb(): number {
    const result = Math.floor(os.freemem() / BYTES_PER_MB);
    return result;
  }

  logicalCpuCount(): number {
    const result = os.cpus().length;
    return result;
  }

  platform(): string {
    const result = os.platform();
    return result;
  }

  runtimeVersion(): string {
    const result = process.version;
    return result;
  }

  totalMb(): number {
    const result = Math.floor(os.totalmem() / BYTES_PER_MB);
    return result;
  }
}
