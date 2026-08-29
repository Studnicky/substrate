import type { FilterValueEntity } from '../FilterValueEntity.js';
import type { PluginContextInterface } from './PluginContextInterface.js';

// Enhanced function signature that accepts context
export interface ContextualComparatorFunctionInterface {
  (
    value1: FilterValueEntity.Type,
    value2: FilterValueEntity.Type,
    context?: PluginContextInterface
  ): number;
}
