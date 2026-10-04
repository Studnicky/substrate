/**
 * @studnicky/entity/browser
 * Entity construction primitives for strict creation and intake boundaries, CSP-safe.
 */
import type { SchemaRegistrySetInterface } from '../interfaces/SchemaRegistrySetInterface.js';

import { EntityClosureRegistrySet } from '../compiler/EntityClosureRegistrySet.js';
import * as EntityCompilerModule from '../EntityCompiler.js';

export class EntityCompiler extends EntityCompilerModule.EntityCompiler {
  protected static override get registries(): SchemaRegistrySetInterface {
    return EntityClosureRegistrySet;
  }
}

export { CodePointError } from '../CodePointError.js';
export { EntityClone } from '../EntityClone.js';
export { EntityCloneError } from '../EntityCloneError.js';
export { EntityCompilerConfigurationError } from '../EntityCompilerConfigurationError.js';
export { SchemaDefaultError } from '../SchemaDefaultError.js';
export { SchemaIntakeError } from '../SchemaIntakeError.js';
export { SchemaNodeDefinitionError } from '../SchemaNodeDefinitionError.js';
export { SchemaPatternError } from '../SchemaPatternError.js';
export { SchemaReferenceError } from '../SchemaReferenceError.js';
