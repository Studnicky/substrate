import type { FunctionPluginHooks, Plugin, SourceDescription } from 'rollup';

/** Rollup-compatible transform adapter for browser and Node context isolation. */
export interface ContextAsyncTransformPluginInterface extends Omit<Plugin, 'transform'>, Record<'enforce', 'pre'> {
  readonly 'transform': (...parameters: Parameters<FunctionPluginHooks['transform']>) => Pick<SourceDescription, 'code' | 'map'> | null;
}
