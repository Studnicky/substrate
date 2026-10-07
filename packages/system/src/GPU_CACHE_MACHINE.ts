import { GpuCacheMachine } from './GpuCacheMachine.js';

/**
 * Module-level singleton — see `GpuCacheMachine`'s doc comment for why a
 * static consumer (`System.gpu()`) shares one reducer instance rather than
 * each holding its own, and why that's the right shape here rather than
 * making `System` instantiable.
 */
export const GPU_CACHE_MACHINE = new GpuCacheMachine();
