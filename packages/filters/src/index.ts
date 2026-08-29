/** Composable declarative filtering primitives. */
export { DefaultConfig } from './config/index.js';
export {
  ArrayLogic,
  Comparator,
  ConditionType,
  ErrorCodes,
  ErrorCollectionMode,
  FilterMode,
  LogicGate,
  Operator,
  PropertyName
} from './enums/index.js';
export {
  FilterCompilationError,
  FilterConfigurationError,
  FilterError,
  FilterEvaluationError,
  FilterGateError,
  FilterOperatorError,
  PluginError,
  RegexError
} from './errors/index.js';
export { FilterEngine } from './FilterEngine.js';
export { FilterValueEntity } from './FilterValueEntity.js';
export { FilterValueGuard } from './FilterValueGuard.js';
export { GroupGateNamesEntity } from './GroupGateNamesEntity.js';
export type {
  DateRangeInterface,
  NumericRangeInterface,
  RangeInterface,
  TimeRangeInterface
} from './interfaces.js';
export type { BasePluginInterface } from './plugins/BasePluginInterface.js';
export {
  Plugin, TimeOperatorsPlugin
} from './plugins/index.js';
export type { PluginContextInterface } from './plugins/PluginContextInterface.js';
