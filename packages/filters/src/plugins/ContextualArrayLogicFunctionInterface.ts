import type { PluginContextInterface } from './PluginContextInterface.js';

// Enhanced function signature that accepts context
export interface ContextualArrayLogicFunctionInterface {
  (
    results: boolean[],
    context?: PluginContextInterface
  ): boolean;
}
