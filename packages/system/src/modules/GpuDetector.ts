import { execFileSync } from 'node:child_process';
import os from 'node:os';

import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';

import { BYTES_PER_MB, EXEC_TIMEOUT_MS, VRAM_STRING_PATTERN } from '../constants/index.js';

export class GpuDetector {
  static #isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  static detect(): GpuInfoEntity.Type | null {
    const platform = os.platform();

    if (platform === 'darwin') {
      return GpuDetector.#detectMetal();
    }

    if (platform === 'linux') {
      return GpuDetector.#detectLinux();
    }

    return null;
  }

  static #detectMetal(): GpuInfoEntity.Type | null {
    try {
      const raw = execFileSync('system_profiler', ['SPDisplaysDataType', '-json'], {
        'timeout': EXEC_TIMEOUT_MS
      }).toString();

      const parsed: unknown = JSON.parse(raw);
      if (!GpuDetector.#isRecord(parsed)) { return null; }
      const displays = parsed.SPDisplaysDataType;

      if (!Array.isArray(displays) || displays.length === 0) {
        return null;
      }

      const first: unknown = displays[0];
      if (!GpuDetector.#isRecord(first)) { return null; }
      const name = typeof first.sppci_model === 'string' ? first.sppci_model : 'Unknown GPU';
      const vramMb = GpuDetector.#parseVramString(
        typeof first.spdisplays_vram === 'string' ? first.spdisplays_vram : null
      );

      return { 'computeApi': 'metal', 'name': name, 'vramMb': vramMb };
    } catch {
      return null;
    }
  }

  static #detectLinux(): GpuInfoEntity.Type | null {
    const nvidia = GpuDetector.#detectNvidia();
    if (nvidia !== null) {
      return nvidia;
    }

    return GpuDetector.#detectAmd();
  }

  static #detectNvidia(): GpuInfoEntity.Type | null {
    try {
      const raw = execFileSync(
        'nvidia-smi',
        ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'],
        { 'timeout': EXEC_TIMEOUT_MS }
      ).toString().trim();

      const firstLine = raw.split('\n')[0];
      if (firstLine === undefined) {
        return null;
      }

      const rawParts = firstLine.split(',');
      const parts: string[] = [];
      for (const raw of rawParts) {
        parts.push(raw.trim());
      }
      const name = parts[0] ?? 'Unknown NVIDIA GPU';
      const vramMbRaw = parts[1];
      const vramMb = vramMbRaw !== undefined ? parseInt(vramMbRaw, 10) : null;

      return {
        'computeApi': 'cuda',
        'name': name,
        'vramMb': vramMb !== null && !isNaN(vramMb) ? vramMb : null
      };
    } catch {
      return null;
    }
  }

  static #detectAmd(): GpuInfoEntity.Type | null {
    try {
      const raw = execFileSync('rocm-smi', ['--showmeminfo', 'vram', '--json'], {
        'timeout': EXEC_TIMEOUT_MS
      }).toString();

      const parsed: unknown = JSON.parse(raw);
      if (!GpuDetector.#isRecord(parsed)) { return null; }
      const keys = Object.keys(parsed);
      const firstKey = keys[0];

      if (firstKey === undefined) {
        return null;
      }

      const gpuInfo: unknown = parsed[firstKey];
      if (!GpuDetector.#isRecord(gpuInfo)) { return null; }
      const vramTotalStr = gpuInfo['VRAM Total Memory (B)'];
      const vramMb = typeof vramTotalStr === 'string'
        ? Math.round(parseInt(vramTotalStr, 10) / BYTES_PER_MB)
        : null;

      return {
        'computeApi': 'opencl',
        'name': 'AMD GPU',
        'vramMb': vramMb !== null && !isNaN(vramMb) ? vramMb : null
      };
    } catch {
      return null;
    }
  }

  static #parseVramString(vramStr: string | null): number | null {
    if (vramStr === null) {
      return null;
    }

    const match = VRAM_STRING_PATTERN.exec(vramStr);
    if (match === null) {
      return null;
    }

    const value = parseFloat(match[1] ?? '0');
    const unit = (match[2] ?? 'MB').toUpperCase();

    if (unit === 'GB') {
      return Math.round(value * 1024);
    }

    return Math.round(value);
  }
}
