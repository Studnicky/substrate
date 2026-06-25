import type { SystemProviderInterface } from '../../interfaces/SystemProviderInterface.js';
import type { GpuInfoType } from '../../types/GpuInfoType.js';

import { GpuDetector } from '../../modules/browser/GpuDetector.js';

type NavigatorCompat = {
  'deviceMemory'?: number;
  'hardwareConcurrency'?: number;
  'userAgent'?: string;
  'userAgentData'?: { 'platform'?: string };
};

export class SystemProvider implements SystemProviderInterface {
  arch(): string {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompat }).navigator;
    const raw = nav?.userAgentData?.platform ?? nav?.userAgent ?? '';
    const lower = raw.toLowerCase();

    if (lower.includes('mac') || lower.includes('iphone') || lower.includes('ipad')) {
      const result = 'arm64';
      return result;
    }

    const result = 'x64';
    return result;
  }

  cpuModel(): string {
    const result = 'Unknown';
    return result;
  }

  detectGpu(): GpuInfoType | null {
    const result = GpuDetector.detect();
    return result;
  }

  freeMb(): number {
    const result = 0;
    return result;
  }

  logicalCpuCount(): number {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompat }).navigator;
    const result = nav?.hardwareConcurrency ?? 1;
    return result;
  }

  platform(): string {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompat }).navigator;
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
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompat }).navigator;
    const result = nav?.userAgent ?? 'unknown';
    return result;
  }

  totalMb(): number {
    const nav = (globalThis as unknown as { 'navigator'?: NavigatorCompat }).navigator;
    const gb = nav?.deviceMemory;

    if (gb === undefined) {
      const result = 0;
      return result;
    }

    const result = Math.floor(gb * 1024);
    return result;
  }
}
