import type { EntityValidationErrorInterface } from '../../interfaces/EntityValidationErrorInterface.js';
import type { EvaluatedTrackerInterface } from './EvaluatedTrackerInterface.js';
import type { ValidationExecutionOptionsInterface } from './ValidationExecutionOptionsInterface.js';

export interface CompiledNodeInterface {
  readonly 'appendErrors'?: (value: unknown, instancePath: string, schemaPath: string, output: EntityValidationErrorInterface[]) => void;
  readonly 'appendErrorsAtRenderedSchemaBase'?: (value: unknown, instancePath: string, renderedSchemaBase: string, output: EntityValidationErrorInterface[]) => void;
  readonly 'appendStaticErrors'?: (value: unknown, instancePath: string, output: EntityValidationErrorInterface[]) => void;
  readonly 'check': (value: unknown, context: ValidationExecutionContextInterface, evaluated?: EvaluatedTrackerInterface) => boolean;
  readonly 'collect': (value: unknown, context: ValidationExecutionContextInterface, instancePath: string, schemaPath: string, evaluated?: EvaluatedTrackerInterface) => EntityValidationErrorInterface[];
}

export interface ValidationExecutionContextInterface {
  readonly 'dynamicScope': DynamicScopeFrameInterface[];
  readonly 'options': ValidationExecutionOptionsInterface;
}

export interface DynamicScopeFrameInterface {
  readonly 'anchors': ReadonlyMap<string, CompiledNodeInterface>;
}
