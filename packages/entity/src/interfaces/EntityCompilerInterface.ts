import type { EntityCreateFunctionInterface } from './EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from './EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from './EntityValidateFunctionInterface.js';
import type { EntityValidationErrorInterface } from './EntityValidationErrorInterface.js';

/** The schema-compilation API every entity module derives its `validate`/`intake`/`create` from. */
export interface EntityCompilerInterface {
  readonly 'compile': <TValidated>(schema: object) => EntityValidateFunctionInterface<TValidated>;
  readonly 'compileCreate': <TValidated extends object>(schema: object) => EntityCreateFunctionInterface<TValidated>;
  readonly 'compileIntake': <TValidated>(schema: object) => EntityIntakeFunctionInterface<TValidated>;
  readonly 'formatErrors': (errors: Readonly<readonly EntityValidationErrorInterface[]> | null | undefined) => string;
}
