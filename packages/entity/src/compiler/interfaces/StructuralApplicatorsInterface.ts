import type { CompiledNodeInterface } from './CompilerExecutionStateInterface.js';
import type { PatternApplicatorInterface } from './PatternApplicatorInterface.js';

/** The compiled `properties`/`patternProperties`/`additionalProperties`/`propertyNames` applicators for one object schema. */
export interface StructuralApplicatorsInterface {
  readonly 'additionalNode': CompiledNodeInterface | undefined;
  readonly 'patterns': readonly PatternApplicatorInterface[];
  readonly 'properties': ReadonlyMap<string, {
    readonly 'instancePathSuffix': string;
    readonly 'node': CompiledNodeInterface;
    readonly 'schemaPathSuffix': string;
  }>;
  readonly 'propertyNamesNode': CompiledNodeInterface | undefined;
  readonly 'propertyNodes': ReadonlyMap<string, CompiledNodeInterface>;
}
