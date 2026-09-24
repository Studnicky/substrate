import type { EntityCreateFunctionInterface } from './EntityCreateFunctionInterface.js';
import type { EntityIntakeFunctionInterface } from './EntityIntakeFunctionInterface.js';
import type { EntityValidateFunctionInterface } from './EntityValidateFunctionInterface.js';
import type { EntityValidationErrorInterface } from './EntityValidationErrorInterface.js';

/** The schema-compilation API every entity module derives its `validate`/`intake`/`create` from. */
export interface EntityCompilerInterface {
  readonly 'compile': <TValidated>(
    schema: object | boolean, remoteSchemas?: ReadonlyMap<string, object | boolean>
  ) => EntityValidateFunctionInterface<TValidated>;
  readonly 'compileCreate': <TValidated extends object>(
    schema: object, remoteSchemas?: ReadonlyMap<string, object | boolean>
  ) => EntityCreateFunctionInterface<TValidated>;
  readonly 'compileIntake': <TValidated>(
    schema: object | boolean, remoteSchemas?: ReadonlyMap<string, object | boolean>
  ) => EntityIntakeFunctionInterface<TValidated>;
  readonly 'formatErrors': (errors: Readonly<readonly EntityValidationErrorInterface[]> | null | undefined) => string;
}
