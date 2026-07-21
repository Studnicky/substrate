import type { CpuSnapshotEntity } from '../../entities/CpuSnapshotEntity.js';
import type { GpuInfoEntity } from '../../entities/GpuInfoEntity.js';
import type { NavigatorCompatEntity } from '../../entities/NavigatorCompatEntity.js';
import type { SystemProviderInterface } from '../../interfaces/SystemProviderInterface.js';

import { GpuDetector } from '../../modules/browser/GpuDetector.js';

export class SystemProvider implements SystemProviderInterface {
  static #navigator(): NavigatorCompatEntity.Type {
    const navigatorValue: unknown = Reflect.get(globalThis, 'navigator');
    if (typeof navigatorValue !== 'object' || navigatorValue === null) {
      return {
        'deviceMemory': 0,
        'hardwareConcurrency': 1,
        'userAgent': '',
        'userAgentData': { 'platform': '' }
      };
    }

    const deviceMemoryValue: unknown = Reflect.get(navigatorValue, 'deviceMemory');
    const hardwareConcurrencyValue: unknown = Reflect.get(navigatorValue, 'hardwareConcurrency');
    const userAgentValue: unknown = Reflect.get(navigatorValue, 'userAgent');
    const userAgentDataValue: unknown = Reflect.get(navigatorValue, 'userAgentData');
    const platformValue: unknown = typeof userAgentDataValue === 'object' && userAgentDataValue !== null
      ? Reflect.get(userAgentDataValue, 'platform')
      : undefined;

    return {
      'deviceMemory': typeof deviceMemoryValue === 'number' && Number.isFinite(deviceMemoryValue)
        ? deviceMemoryValue
        : 0,
      'hardwareConcurrency': typeof hardwareConcurrencyValue === 'number'
        && Number.isInteger(hardwareConcurrencyValue)
        && hardwareConcurrencyValue > 0
        ? hardwareConcurrencyValue
        : 1,
      'userAgent': typeof userAgentValue === 'string' ? userAgentValue : '',
      'userAgentData': { 'platform': typeof platformValue === 'string' ? platformValue : '' }
    };
  }

  arch(): string {
    const nav = SystemProvider.#navigator();
    const raw = nav.userAgentData?.platform ?? nav.userAgent ?? '';
    const lower = raw.toLowerCase();

    if (lower.includes('mac') || lower.includes('iphone') || lower.includes('ipad')) {
      const result = 'arm64';
      return result;
    }

    const result = 'x64';
    return result;
  }

  cpuInfo(): CpuSnapshotEntity.Type {
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
    const nav = SystemProvider.#navigator();
    const result = nav.hardwareConcurrency ?? 1;
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
    const nav = SystemProvider.#navigator();
    const raw = nav.userAgentData?.platform ?? nav.userAgent ?? '';
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
    const nav = SystemProvider.#navigator();
    const result = nav.userAgent ?? 'unknown';
    return result;
  }

  totalMb(): number {
    const nav = SystemProvider.#navigator();
    const gb = nav.deviceMemory;

    if (gb === undefined) {
      const result = 0;
      return result;
    }

    const result = Math.floor(gb * 1024);
    return result;
  }
}
