---
title: '@studnicky/system'
description: CPU, GPU, memory, and platform introspection for Node.js processes.
---

# @studnicky/system

> Static host-system inspection: CPU topology, GPU detection (Metal/CUDA/ROCm), memory, and platform info.

## Install

```bash
pnpm add @studnicky/system
```

Requires `@studnicky:registry=https://npm.pkg.github.com` in `.npmrc`.

## Usage

### CPU, memory, and platform

Read CPU topology, memory usage, and platform info synchronously, plus the computed worker-pool recommendation:

<<< ../../packages/system/examples/cpuMemoryPlatform.ts#usage

### GPU detection

`System.gpu()` synchronously detects and caches GPU information, then returns a defensive copy. It invokes `system_profiler`
on macOS, `nvidia-smi` for Linux NVIDIA systems, or `rocm-smi` for Linux AMD systems,
returning `null` when detection is unavailable. Import `System` from `@studnicky/system` and
use the canonical `System.cpu`, `System.gpu()`, `System.memory`, and `System.platform` APIs.

## Try it

<RunnableExample src="packages/system/examples/cpuMemoryPlatform" title="CPU topology, memory, and platform info" />

The output shows live CPU architecture, model, logical and physical counts, `optimalWorkerCount`, total and free memory in megabytes, OS name, runtime version string, and the Apple Silicon flag — all read from `navigator` in-browser.

## API

| Export | Type | Description |
|--------|------|-------------|
| `System` | class | Static-only system introspection API |
| `CpuInfoEntity.Type` | entity type | `{ arch, logicalCount, physicalCount, model }` |
| `MemoryInfoEntity.Type` | entity type | `{ totalMb, freeMb }` |
| `PlatformInfoEntity.Type` | entity type | `{ os, isAppleSilicon, nodeVersion }` |
| `GpuInfoEntity.Type` | entity type | `{ name, computeApi, vramMb }` |
| `SystemInfoEntity.Type` | entity type | Canonical composition of CPU, GPU, memory, and platform data |
| `SystemProviderInterface` | interface | Runtime provider contract used by platform implementations |

### `System`

| Member | Signature | Description |
|--------|-----------|-------------|
| `cpu` | `static get cpu(): CpuInfoEntity.Type` | CPU model, architecture, logical count, and physical count |
| `memory` | `static get memory(): MemoryInfoEntity.Type` | Total and free memory in megabytes |
| `platform` | `static get platform(): PlatformInfoEntity.Type` | OS, Node.js version, and Apple Silicon flag |
| `gpu` | `static gpu(): GpuInfoEntity.Type \| null` | Detects and caches GPU information; returns a defensive copy or `null` when unavailable |
| `optimalWorkerCount` | `static get optimalWorkerCount(): number` | `max(1, System.cpu.logicalCount - 1)` |

### `GpuInfoEntity.Type.computeApi` values

| Value | Platform | Detector |
|-------|----------|----------|
| `'metal'` | macOS | `system_profiler SPDisplaysDataType` |
| `'cuda'` | Linux (NVIDIA) | `nvidia-smi` |
| `'opencl'` | Linux (AMD) | `rocm-smi` |
| `'software'` | software renderer | reported by providers that identify a software-backed renderer |

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/system)
