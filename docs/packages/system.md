---
title: '@studnicky/system'
description: CPU, GPU, memory, and platform introspection for Node.js processes.
---

# @studnicky/system

> Static host-system inspection — CPU topology, GPU detection (Metal/CUDA/ROCm), memory, and platform info.

## Install

```bash
pnpm add @studnicky/system
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

### CPU

```typescript
import { System } from '@studnicky/system';

const cpu = System.cpu;
// { arch: 'arm64', logicalCount: 10, physicalCount: 10, model: 'Apple M2 Pro' }

System.logicalCpuCount;    // 10
System.optimalWorkerCount; // 9 — logicalCount - 1, min 1
```

### Memory

```typescript
const mem = System.memory;
// { totalMb: 32768, freeMb: 18432 }
```

### Platform

```typescript
const platform = System.platform;
// { os: 'darwin', arch: 'arm64', isAppleSilicon: true, nodeVersion: 'v22.3.0' }

System.isAppleSilicon; // true
```

### GPU detection

GPU detection is async — it shells out to `system_profiler` (macOS), `nvidia-smi` (Linux NVIDIA), or `rocm-smi` (Linux AMD). Results are cached after the first call.

```typescript
const gpu = await System.gpu();
if (gpu !== null) {
  console.log(gpu.name);       // 'Apple M2 Pro'
  console.log(gpu.computeApi); // 'metal' | 'cuda' | 'opencl' | 'software'
  console.log(gpu.vramMb);     // 24576, or null when not reported
}
```

### Full snapshot

```typescript
const info = await System.snapshot();
// {
//   cpu:      CpuInfoType,
//   memory:   MemoryInfoType,
//   platform: PlatformInfoType,
//   gpu:      GpuInfoType | null
// }
```

## API

| Export | Type | Description |
|--------|------|-------------|
| `System` | class | Static-only system introspection API |
| `CpuInfoType` | type | `{ arch, logicalCount, physicalCount, model }` |
| `MemoryInfoType` | type | `{ totalMb, freeMb }` |
| `PlatformInfoType` | type | `{ os, isAppleSilicon, nodeVersion }` |
| `GpuInfoType` | type | `{ name, computeApi, vramMb }` |
| `SystemInfoType` | type | Aggregates all four info types |

### `System`

| Member | Signature | Description |
|--------|-----------|-------------|
| `cpu` | `static get cpu(): CpuInfoType` | CPU model, arch, logical and physical count |
| `memory` | `static get memory(): MemoryInfoType` | Total and free memory in megabytes |
| `platform` | `static get platform(): PlatformInfoType` | OS, Node.js version, Apple Silicon flag |
| `gpu` | `static gpu(): Promise<GpuInfoType \| null>` | Detects GPU; returns `null` when unavailable; cached after first call |
| `logicalCpuCount` | `static get logicalCpuCount(): number` | Shorthand for `System.cpu.logicalCount` |
| `optimalWorkerCount` | `static get optimalWorkerCount(): number` | `max(1, logicalCpuCount - 1)` — leaves one core for the event loop |
| `isAppleSilicon` | `static get isAppleSilicon(): boolean` | True on `darwin`/`arm64` |
| `snapshot` | `static snapshot(): Promise<SystemInfoType>` | Returns all info as a single object |

### `GpuInfoType.computeApi` values

| Value | Platform | Detector |
|-------|----------|----------|
| `'metal'` | macOS | `system_profiler SPDisplaysDataType` |
| `'cuda'` | Linux (NVIDIA) | `nvidia-smi` |
| `'opencl'` | Linux (AMD) | `rocm-smi` |
| `'software'` | fallback | reported when no hardware accelerator found |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/system)
