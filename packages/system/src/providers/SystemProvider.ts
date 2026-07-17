import os from 'node:os';

import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';
import type { SystemProviderInterface } from '../interfaces/SystemProviderInterface.js';

import { BYTES_PER_MB } from '../constants/index.js';
import { GpuDetector } from '../modules/GpuDetector.js';

export class SystemProvider implements SystemProviderInterface {
  arch(): string {
    const result = os.arch();
    return result;
  }

  /**
   * Enumerates `os.cpus()` exactly once and derives logical count, model,
   * and physical count from that single result — callers needing more than
   * one of these fields (e.g. the `cpu` getter) should use this instead of
   * combining `logicalCpuCount()`, `cpuModel()`, and `physicalCpuCount()`,
   * which each re-enumerate independently.
   */
  cpuInfo(): { 'logicalCount': number; 'model': string; 'physicalCount': number } {
    const cpus = os.cpus();
    const logicalCount = cpus.length;
    const model = cpus[0]?.model ?? 'Unknown';

    return {
      'logicalCount': logicalCount,
      'model': model,
      'physicalCount': logicalCount
    };
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

  /**
   * Node has no reliable, cross-platform way to read the true physical core
   * count — `os.cpus()` only reports logical (thread) count, and detecting
   * hyperthreading state requires unreliable platform-specific shell-outs
   * (e.g. `sysctl`, `/proc/cpuinfo`, WMI) that vary by OS, permissions, and
   * virtualization. Rather than guess via an arch heuristic that silently
   * halves the count on every non-arm64 CPU (wrong for HT-disabled BIOS/VM
   * configs and many low-end/server SKUs), this reports the logical count
   * as the physical count. Under-reporting parallelism is unlikely; the
   * previous heuristic could over-halve a correct count, which is worse for
   * callers sizing thread/worker pools off this value.
   */
  physicalCpuCount(): number {
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
