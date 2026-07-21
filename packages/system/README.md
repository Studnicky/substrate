# @studnicky/system

> Static host-system inspection — CPU topology, GPU detection (Metal/CUDA/ROCm), memory, and platform info.

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/system)

`@studnicky/system` exposes static accessors for host hardware and runtime environment without loading native addons. CPU topology (logical and physical core counts, architecture, model name), memory availability, and platform metadata are read synchronously from Node.js built-ins, making them safe to call at module initialisation time.

GPU detection runs once on the first `System.gpu()` call and caches the result; each call returns a defensive copy. On macOS it reads display information through `system_profiler`; on Linux it queries NVIDIA or AMD command-line tools. Read `System.cpu`, `System.gpu()`, `System.memory`, and `System.platform` explicitly so each call performs only the inspection the caller needs.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/system
```

## Usage

```typescript
import { System } from '@studnicky/system';

// CPU topology
const cpu = System.cpu;
console.log(cpu.arch);          // e.g. 'arm64'
console.log(cpu.model);         // e.g. 'Apple M3 Pro'
console.log(cpu.logicalCount);  // e.g. 12
console.log(cpu.physicalCount); // e.g. 6

// Worker pool sizing
const workers = System.optimalWorkerCount; // max(1, logicalCount - 1)

// Memory (values in MB)
const mem = System.memory;
console.log(`${mem.freeMb} MB free of ${mem.totalMb} MB`);

// Platform
const plat = System.platform;
console.log(plat.os);            // e.g. 'darwin'
console.log(plat.nodeVersion);   // e.g. 'v22.3.0'
console.log(plat.isAppleSilicon); // true on darwin/arm64

// GPU detection (result cached after first call)
const gpu = System.gpu();
if (gpu !== null) {
  console.log(gpu.name);        // e.g. 'Apple M3 Pro'
  console.log(gpu.computeApi);  // 'metal' | 'cuda' | 'opencl' | 'software'
  console.log(gpu.vramMb);      // number | null
}

```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/system

## License

MIT
