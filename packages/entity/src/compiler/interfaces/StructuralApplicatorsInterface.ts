import type { CompiledNodeInterface } from './CompilerExecutionStateInterface.js';
import type { PatternApplicatorInterface } from './PatternApplicatorInterface.js';

/** The compiled `properties`/`patternProperties`/`additionalProperties`/`propertyNames` applicators for one object schema. */
export interface StructuralApplicatorsInterface {
  readonly 'additionalNode': CompiledNodeInterface | undefined;
  readonly 'patterns': readonly PatternApplicatorInterface[];
  readonly 'properties': ReadonlyMap<string, CompiledNodeInterface>;
  readonly 'propertyNamesNode': CompiledNodeInterface | undefined;
}
