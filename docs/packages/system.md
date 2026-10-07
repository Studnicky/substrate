# @studnicky/system

## What it is

`@studnicky/system` reports host facts a runtime needs to make sizing and capability decisions: CPU topology, memory, platform, and GPU detection. The Node entry reads the host directly; the browser entry reports only what a browser can observe.

## What it is for

A worker pool sizes itself from logical CPU count, and a rendering path chooses a hardware-accelerated implementation only when a GPU is present. `System` supplies those facts through one static API in both environments.

## Northstar Books examples

Northstar Books' search indexer sizes its worker pool from `System.optimalWorkerCount` on the server, and the storefront checks `System.platform` in the browser to pick an input path.

## Install

```sh
pnpm add @studnicky/system
```

## Usage

Read host facts through the static `System` API: `System.cpu`, `System.memory`, `System.platform`, `System.gpu()`, and `System.optimalWorkerCount`. Each property returns a fresh value validated against its entity schema.

## Public entrypoints

| Import path                    | Use it when                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| `@studnicky/system/node`       | A Node server or worker reads host facts, including GPU detection. |
| `@studnicky/system/browser`    | A browser bundle reads the facts a browser can observe.            |
| `@studnicky/system/entities`   | A consumer needs the host-facts schemas as contracts.              |
| `@studnicky/system/interfaces` | A consumer needs the `SystemInterface` contract for its own types. |

## Exports

| Symbol   | Purpose                                                                                | Import path              |
| -------- | -------------------------------------------------------------------------------------- | ------------------------ |
| `System` | Static host-facts API: `cpu`, `memory`, `platform`, `gpu()`, and `optimalWorkerCount`. | `@studnicky/system/node` |

## Entities

`CpuInfoEntity`, `MemoryInfoEntity`, `PlatformInfoEntity`, `GpuInfoEntity`, and `SystemInfoEntity` are schema-derived contracts available from `@studnicky/system/entities`.

<RunnableExample src="packages/system/examples/cpuMemoryPlatform" title="Host facts — CPU, memory, and platform" />
