import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { AlphabeticRangeEntity } from './AlphabeticRangeEntity.js';
import { CidrRangeEntity } from './CidrRangeEntity.js';
import { DateRangeEntity } from './DateRangeEntity.js';
import { OutlierMarkerEntity } from './OutlierMarkerEntity.js';
import { RangeEntity } from './RangeEntity.js';
import { SemverRangeEntity } from './SemverRangeEntity.js';
import { SequentialRangeEntity } from './SequentialRangeEntity.js';

/** Union of all possible values a resolved GroupNode can hold. */
export namespace GroupNodeValueEntity {
  export const Schema = {
    'oneOf': [
      AlphabeticRangeEntity.Schema,
      CidrRangeEntity.Schema,
      DateRangeEntity.Schema,
      OutlierMarkerEntity.Schema,
      RangeEntity.Schema,
      SemverRangeEntity.Schema,
      SequentialRangeEntity.Schema,
      { 'type': 'string' },
      { 'type': 'null' }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([AlphabeticRangeEntity.Node, CidrRangeEntity.Node, DateRangeEntity.Node, OutlierMarkerEntity.Node, RangeEntity.Node, SemverRangeEntity.Node, SequentialRangeEntity.Node, SchemaNode.defineString({ 'type': 'string' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
