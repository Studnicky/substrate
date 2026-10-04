import type { EntityIntakeFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';

/** The members of a scenario-case entity namespace that scenario-kit reads: the raw `Schema`, its parallel `Node`, and the entity's own `intake`. */
export interface ScenarioCaseEntityInterface<TCase> {
  readonly 'intake': EntityIntakeFunctionInterface<TCase>;
  readonly 'Node': SchemaNodeInterface<unknown, unknown>;
  readonly 'Schema': Record<string, unknown>;
}
