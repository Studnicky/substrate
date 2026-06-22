import { execFileSync } from 'node:child_process';
import os from 'node:os';

import type { GpuInfoType } from '../types/GpuInfoType.js';

const EXEC_TIMEOUT_MS = 3000;
const BYTES_PER_MB = 1024 * 1024;

export class GpuDetector {
  static detect(): GpuInfoType | null {
    const platform = os.platform();

    if (platform === 'darwin') {
      return GpuDetector.#detectMetal();
    }

    if (platform === 'linux') {
      return GpuDetector.#detectLinux();
    }

    return null;
  }

  static #detectMetal(): GpuInfoType | null {
    try {
      const raw = execFileSync('system_profiler', ['SPDisplaysDataType', '-json'], {
        timeout: EXEC_TIMEOUT_MS
      }).toString();

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const displays = parsed['SPDisplaysDataType'];

      if (!Array.isArray(displays) || displays.length === 0) {
        return null;
      }

      const first = displays[0] as Record<string, unknown>;
      const name = typeof first['sppci_model'] === 'string' ? first['sppci_model'] : 'Unknown GPU';
      const vramMb = GpuDetector.#parseVramString(
        typeof first['spdisplays_vram'] === 'string' ? first['spdisplays_vram'] : null
      );

      return { computeApi: 'metal', name, vramMb };
    } catch {
      return null;
    }
  }

  static #detectLinux(): GpuInfoType | null {
    const nvidia = GpuDetector.#detectNvidia();
    if (nvidia !== null) {
      return nvidia;
    }

    return GpuDetector.#detectAmd();
  }

  static #detectNvidia(): GpuInfoType | null {
    try {
      const raw = execFileSync(
        'nvidia-smi',
        ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'],
        { timeout: EXEC_TIMEOUT_MS }
      ).toString().trim();

      const firstLine = raw.split('\n')[0];
      if (firstLine === undefined) {
        return null;
      }

      const parts = firstLine.split(',').map(s => s.trim());
      const name = parts[0] ?? 'Unknown NVIDIA GPU';
      const vramMbRaw = parts[1];
      const vramMb = vramMbRaw !== undefined ? parseInt(vramMbRaw, 10) : null;

      return {
        computeApi: 'cuda',
        name,
        vramMb: vramMb !== null && !isNaN(vramMb) ? vramMb : null
      };
    } catch {
      return null;
    }
  }

  static #detectAmd(): GpuInfoType | null {
    try {
      const raw = execFileSync('rocm-smi', ['--showmeminfo', 'vram', '--json'], {
        timeout: EXEC_TIMEOUT_MS
      }).toString();

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const keys = Object.keys(parsed);
      const firstKey = keys[0];

      if (firstKey === undefined) {
        return null;
      }

      const gpuInfo = parsed[firstKey] as Record<string, unknown>;
      const vramTotalStr = gpuInfo['VRAM Total Memory (B)'];
      const vramMb = typeof vramTotalStr === 'string'
        ? Math.round(parseInt(vramTotalStr, 10) / BYTES_PER_MB)
        : null;

      return {
        computeApi: 'opencl',
        name: 'AMD GPU',
        vramMb: vramMb !== null && !isNaN(vramMb) ? vramMb : null
      };
    } catch {
      return null;
    }
  }

  static #parseVramString(vramStr: string | null): number | null {
    if (vramStr === null) {
      return null;
    }

    const match = /(\d+(?:\.\d+)?)\s*(GB|MB)/i.exec(vramStr);
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
