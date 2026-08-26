import type { ContextualArrayLogicFunctionInterface } from './ContextualArrayLogicFunctionInterface.js';
import type { ContextualComparatorFunctionInterface } from './ContextualComparatorFunctionInterface.js';
import type { ContextualLogicGateFunctionInterface } from './ContextualLogicGateFunctionInterface.js';
import type { ContextualOperatorFunctionInterface } from './ContextualOperatorFunctionInterface.js';

export interface BasePluginInterface {
  /**
   * Optional array logic functions provided by this plugin
   * Keys become available as PluginClassName:LOGIC_NAME
   * Support field-level configuration via context.options
   */
  'arrayLogic'?: Record<string, ContextualArrayLogicFunctionInterface>;

  /**
   * Optional comparators provided by this plugin
   * Keys become available as PluginClassName:COMPARATOR_NAME
   * Support field-level configuration via context.options
   */
  'comparators'?: Record<string, ContextualComparatorFunctionInterface>;

  /**
   * Optional logic gates provided by this plugin
   * Keys become available as PluginClassName:GATE_NAME
   * Support field-level configuration via context.options
   */
  'gates'?: Record<string, ContextualLogicGateFunctionInterface>;

  /**
   * Optional operators provided by this plugin
   * Keys become available as PluginClassName:OPERATOR_NAME
   * Support field-level configuration via context.options
   */
  'operators'?: Record<string, ContextualOperatorFunctionInterface>;
}
