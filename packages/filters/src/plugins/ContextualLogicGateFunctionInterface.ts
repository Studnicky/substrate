import type { PluginContextInterface } from './PluginContextInterface.js';

// Enhanced function signature that accepts context
export interface ContextualLogicGateFunctionInterface {
  (
    results: boolean[],
    context?: PluginContextInterface
  ): boolean;
}
