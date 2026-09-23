/**
 * @studnicky/entity/node
 * Entity construction primitives for strict creation and intake boundaries, Ajv-backed.
 */
import type { SchemaRegistrySetInterface } from '../interfaces/SchemaRegistrySetInterface.js';

import * as EntityCompilerModule from '../EntityCompiler.js';
import { EntityAjvRegistry } from './EntityAjvRegistry.js';

export class EntityCompiler extends EntityCompilerModule.EntityCompiler {
  protected static override get registries(): SchemaRegistrySetInterface {
    return EntityAjvRegistry;
  }
}

export { EntityClone } from '../EntityClone.js';
export { SchemaIntakeError } from '../SchemaIntakeError.js';
