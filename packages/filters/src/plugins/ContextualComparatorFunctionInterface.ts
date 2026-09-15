import type { RuntimeValue } from '@studnicky/types/node';

import type { FilterValueEntity } from '../FilterValueEntity.js';
import type { PluginContextInterface } from './PluginContextInterface.js';

// Enhanced function signature that accepts context
export interface ContextualComparatorFunctionInterface {
  (
    value1: ReturnType<typeof RuntimeValue.intake>,
    value2: FilterValueEntity.Type,
    context?: PluginContextInterface
  ): boolean;
}
