import type { GpuInfoEntity } from '../../entities/GpuInfoEntity.js';
import type { NavigatorCompatEntity } from '../../entities/NavigatorCompatEntity.js';
import type { SystemProviderInterface } from '../../interfaces/SystemProviderInterface.js';

import { GpuDetector } from '../../modules/browser/GpuDetector.js';

export class SystemProvider implements SystemProviderInterface {
  arch(): string {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompatEntity.Type }).navigator;
    const raw = nav?.userAgentData?.platform ?? nav?.userAgent ?? '';
    const lower = raw.toLowerCase();

    if (lower.includes('mac') || lower.includes('iphone') || lower.includes('ipad')) {
      const result = 'arm64';
      return result;
    }

    const result = 'x64';
    return result;
  }

  cpuInfo(): { 'logicalCount': number; 'model': string; 'physicalCount': number } {
    const logicalCount = this.logicalCpuCount();

    return {
      'logicalCount': logicalCount,
      'model': this.cpuModel(),
      'physicalCount': logicalCount
    };
  }

  cpuModel(): string {
    const result = 'Unknown';
    return result;
  }

  detectGpu(): GpuInfoEntity.Type | null {
    const result = GpuDetector.detect();
    return result;
  }

  freeMb(): number {
    const result = 0;
    return result;
  }

  logicalCpuCount(): number {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompatEntity.Type }).navigator;
    const result = nav?.hardwareConcurrency ?? 1;
    return result;
  }

  /**
   * The browser has no API for true physical core count — `navigator
   * .hardwareConcurrency` only reports logical (thread) count. Reporting
   * the logical count as the physical count avoids silently under- or
   * over-estimating available parallelism with an unreliable heuristic.
   */
  physicalCpuCount(): number {
    const result = this.logicalCpuCount();
    return result;
  }

  platform(): string {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompatEntity.Type }).navigator;
    const raw = nav?.userAgentData?.platform ?? nav?.userAgent ?? '';
    const lower = raw.toLowerCase();

    if (lower.includes('mac') || lower.includes('iphone') || lower.includes('ipad')) {
      const result = 'darwin';
      return result;
    }

    if (lower.includes('win')) {
      const result = 'win32';
      return result;
    }

    if (lower.includes('linux') || lower.includes('android')) {
      const result = 'linux';
      return result;
    }

    const result = 'unknown';
    return result;
  }

  runtimeVersion(): string {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompatEntity.Type }).navigator;
    const result = nav?.userAgent ?? 'unknown';
    return result;
  }

  totalMb(): number {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompatEntity.Type }).navigator;
    const gb = nav?.deviceMemory;

    if (gb === undefined) {
      const result = 0;
      return result;
    }

    const result = Math.floor(gb * 1024);
    return result;
  }
}
