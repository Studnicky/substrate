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

Read CPU topology, memory usage, and platform info synchronously, plus computed shorthands for common worker-pool decisions:

<<< ../../packages/system/examples/cpuMemoryPlatform.ts#usage

### GPU detection and full snapshot

GPU detection is async: it shells out to `system_profiler` (macOS), `nvidia-smi` (Linux NVIDIA), or `rocm-smi` (Linux AMD). Results are cached after the first call. `System.snapshot()` returns all four info objects together:

<<< ../../packages/system/examples/snapshot.ts#usage

## Try it

<RunnableExample src="packages/system/examples/cpuMemoryPlatform" title="CPU topology, memory, and platform info" />

The output shows live CPU architecture, model, logical and physical counts, `optimalWorkerCount`, total and free memory in megabytes, OS name, runtime version string, and the Apple Silicon flag — all read from `navigator` in-browser.

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
| `optimalWorkerCount` | `static get optimalWorkerCount(): number` | `max(1, logicalCpuCount - 1)` (leaves one core for the event loop) |
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
