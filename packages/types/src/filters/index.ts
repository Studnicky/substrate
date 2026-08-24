/**
 * @synoma/filters
 * Main entry point for the advanced filtering engine
 */

// Import configuration
import { DefaultConfig } from './config/index.js';
import { ArrayLogic } from './enums/ArrayLogic.js';
import { Comparator } from './enums/Comparator.js';
import { ConditionType } from './enums/ConditionType.js';
import { ErrorCodes } from './enums/ErrorCodes.js';
import { ErrorCollectionMode } from './enums/ErrorCollectionMode.js';
import { FilterMode } from './enums/FilterMode.js';
import { LogicGate } from './enums/LogicGate.js';
import { Operator } from './enums/Operator.js';
import { PropertyName } from './enums/PropertyName.js';
// Import error classes
import {
  FilterCompilationError,
  FilterConfigurationError,
  FilterError,
  FilterEvaluationError,
  FilterGateError,
  FilterOperatorError,
  PluginError
} from './errors/index.js';
// Error classes are re-exported, not directly used here
import { FilterEngine } from './FilterEngine.js';
// Plugin system is now internal - no direct access needed
// Utilities are not exported, only used internally
import { DeepFreeze } from './utils/deepFreeze.js';

// PluginManager class removed - global registries not supported
// Use instance-based Plugins class instead

// Export FilterEngine class - primary API
export { FilterEngine };

export type {
  BasePlugin, PluginContext
} from './plugins/BasePlugin.js';

// Export plugin system
export {
  Plugin, TimeOperatorsPlugin
} from './plugins/index.js';
// Export range interfaces
export type {
  DateRange,
  NumericRange,
  Range,
  TimeRange
} from './types.js';

// Export individual enums and config directly
export {
  ArrayLogic, Comparator, DefaultConfig, ErrorCollectionMode, FilterMode, LogicGate, Operator
};


// Export Types namespace - all enums and type-related exports
export const Types = DeepFreeze.deepFreeze({
  'ArrayLogic': ArrayLogic,
  'Comparator': Comparator,
  // Internal enums (for advanced usage/tooling)
  'ConditionType': ConditionType,
  // Error codes for error handling
  'ErrorCodes': ErrorCodes,
  'ErrorCollectionMode': ErrorCollectionMode,
  // Core filtering enums (user-facing)
  'FilterMode': FilterMode,

  'LogicGate': LogicGate,

  'Operator': Operator,
  'PropertyName': PropertyName
});

// Export Errors namespace - all error classes
export const Errors = DeepFreeze.deepFreeze({
  'FilterCompilationError': FilterCompilationError,
  'FilterConfigurationError': FilterConfigurationError,
  'FilterError': FilterError,
  'FilterEvaluationError': FilterEvaluationError,
  'FilterGateError': FilterGateError,
  'FilterOperatorError': FilterOperatorError,
  'PluginError': PluginError
});

// Plugin system is now fully declarative - no exports needed
// Use 'plugins' configuration in FilterEngine constructor instead
