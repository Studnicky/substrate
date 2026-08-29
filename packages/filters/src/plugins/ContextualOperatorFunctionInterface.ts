import type { FilterValueEntity } from '../FilterValueEntity.js';
import type { PluginContextInterface } from './PluginContextInterface.js';

// Enhanced function signature that accepts context
export interface ContextualOperatorFunctionInterface {
  (
    value: FilterValueEntity.Type,
    filterValue: FilterValueEntity.Type,
    context?: PluginContextInterface
  ): boolean;
}
