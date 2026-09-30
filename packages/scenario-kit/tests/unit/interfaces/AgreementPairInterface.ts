import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';

/** A hand-authored `Schema` and the `Node` it is claimed to agree with. */
export interface AgreementPairInterface {
  readonly 'node': SchemaNodeInterface<unknown, unknown>;
  readonly 'schema': Record<string, unknown>;
}
