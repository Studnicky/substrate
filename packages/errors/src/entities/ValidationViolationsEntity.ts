import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ValidationViolationEntity } from './ValidationViolationEntity.js';

/** An ordered list of `ValidationViolationEntity` items — the shape `ValidationErrors` wraps. */
export namespace ValidationViolationsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolations',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'items': ValidationViolationEntity.Schema,
    'title': 'ValidationViolations',
    'type': 'array'
  } as const;

  export const Node = SchemaNode.defineArray(
    { '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolations', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ValidationViolations', 'type': 'array' } as const,
    ValidationViolationEntity.Node,
    undefined
  );
  export type Type = NodeStaticType<typeof Node>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
}
