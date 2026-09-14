import type { RuntimeValue } from '@studnicky/types/node';

import type { FilterValueEntity } from '../FilterValueEntity.js';
import type { PluginContextInterface } from './PluginContextInterface.js';

// Enhanced function signature that accepts context
export interface ContextualOperatorFunctionInterface {
  (
    value: ReturnType<typeof RuntimeValue.intake>,
    filterValue: FilterValueEntity.Type,
    context?: PluginContextInterface
  ): boolean;
}
