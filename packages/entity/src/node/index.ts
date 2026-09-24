/**
 * @studnicky/entity/node
 * Entity construction primitives for strict creation and intake boundaries, specialised-closure engine backed.
 */
import type { SchemaRegistrySetInterface } from '../interfaces/SchemaRegistrySetInterface.js';

import { EntityClosureRegistrySet } from '../compiler/EntityClosureRegistrySet.js';
import * as EntityCompilerModule from '../EntityCompiler.js';

export class EntityCompiler extends EntityCompilerModule.EntityCompiler {
  protected static override get registries(): SchemaRegistrySetInterface {
    return EntityClosureRegistrySet;
  }
}

export { EntityClone } from '../EntityClone.js';
export { SchemaIntakeError } from '../SchemaIntakeError.js';
