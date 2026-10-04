import type { SchemaRegistrySetInterface } from '../interfaces/SchemaRegistrySetInterface.js';

import { EntityClosureRegistry } from './EntityClosureRegistry.js';

/** The isolated specialised-closure compilers that back assertion, intake, and creation. */
export const EntityClosureRegistrySet: SchemaRegistrySetInterface = {
  'assert': EntityClosureRegistry.create(false),
  'create': EntityClosureRegistry.create(true),
  'intake': EntityClosureRegistry.create(true)
};
