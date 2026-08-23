import * as childProcess from 'node:child_process';
import os from 'node:os';

import type { GpuInfoEntity } from '../entities/GpuInfoEntity.js';

import { BYTES_PER_MB, EXEC_TIMEOUT_MS, VRAM_STRING_PATTERN } from '../constants/index.js';

interface GpuDetectorDepsInterface {
  readonly 'execFileSync': (
    command: string,
    argumentList: readonly string[],
    options: { readonly 'timeout': number }
  ) => Buffer | string;
  readonly 'platform': () => NodeJS.Platform;
}

export class GpuDetector {
  static #defaultDeps(): GpuDetectorDepsInterface {
    return {
      'execFileSync': childProcess.execFileSync,
      'platform': os.platform
    };
  }

  static #isRecord(value: unknown): value is Record<string, unknown> {
    const result = typeof value === 'object' && value !== null && !Array.isArray(value);
    return result;
  }

  static detect(deps: GpuDetectorDepsInterface = GpuDetector.#defaultDeps()): GpuInfoEntity.Type | null {
    const platform = deps.platform();

    if (platform === 'darwin') {
      const result = GpuDetector.#detectMetal(deps);
      return result;
    }

    if (platform === 'linux') {
      const result = GpuDetector.#detectLinux(deps);
      return result;
    }

    return null;
  }

  static #detectMetal(deps: GpuDetectorDepsInterface): GpuInfoEntity.Type | null {
    try {
      const raw = deps.execFileSync('system_profiler', ['SPDisplaysDataType', '-json'], {
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

      const result: GpuInfoEntity.Type = { 'computeApi': 'metal', 'name': name, 'vramMb': vramMb };
      return result;
    } catch {
      return null;
    }
  }

  static #detectLinux(deps: GpuDetectorDepsInterface): GpuInfoEntity.Type | null {
    const nvidia = GpuDetector.#detectNvidia(deps);
    if (nvidia !== null) {
      return nvidia;
    }

    const result = GpuDetector.#detectAmd(deps);
    return result;
  }

  static #detectNvidia(deps: GpuDetectorDepsInterface): GpuInfoEntity.Type | null {
    try {
      const raw = deps.execFileSync(
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
      const rawPartsLength = rawParts.length;
      for (let rawPartIndex = 0; rawPartIndex < rawPartsLength; rawPartIndex += 1) {
        const raw = rawParts[rawPartIndex]!;
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

  static #detectAmd(deps: GpuDetectorDepsInterface): GpuInfoEntity.Type | null {
    try {
      const raw = deps.execFileSync('rocm-smi', ['--showmeminfo', 'vram', '--json'], {
        'timeout': EXEC_TIMEOUT_MS
      }).toString();

      const parsed: unknown = JSON.parse(raw);
      if (!GpuDetector.#isRecord(parsed)) { return null; }
      const keys = Object.keys(parsed);
      const firstKey = keys[0];

      if (firstKey === undefined) {
        return null;
      }

      const gpuInfo: unknown = Reflect.get(parsed, firstKey);
      if (!GpuDetector.#isRecord(gpuInfo)) { return null; }
      const vramTotalString = Reflect.get(gpuInfo, 'VRAM Total Memory (B)');
      const vramMb = typeof vramTotalString === 'string'
        ? Math.round(parseInt(vramTotalString, 10) / BYTES_PER_MB)
        : null;

      const result: GpuInfoEntity.Type = {
        'computeApi': 'opencl',
        'name': 'AMD GPU',
        'vramMb': vramMb !== null && !isNaN(vramMb) ? vramMb : null
      };
      return result;
    } catch {
      return null;
    }
  }

  static #parseVramString(vramString: string | null): number | null {
    if (vramString === null) {
      return null;
    }

    const match = VRAM_STRING_PATTERN.exec(vramString);
    if (match === null) {
      return null;
    }

    const value = parseFloat(match[1] ?? '0');
    const unit = (match[2] ?? 'MB').toUpperCase();

    if (unit === 'GB') {
      const result = Math.round(value * 1024);
      return result;
    }

    const result = Math.round(value);
    return result;
  }
}
