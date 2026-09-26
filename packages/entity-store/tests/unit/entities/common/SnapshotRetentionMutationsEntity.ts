import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { NestedMutationEntity } from "./NestedMutationEntity.js";

/** Mutations applied across batched, replaced, and upserted snapshot retention paths. */
export namespace SnapshotRetentionMutationsEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      batched: NestedMutationEntity.Schema,
      replacement: NestedMutationEntity.Schema,
      upserted: NestedMutationEntity.Schema,
    },
    required: ["batched", "replacement", "upserted"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject({ type: "object" } as const, {
      batched: NestedMutationEntity.Node,
      replacement: NestedMutationEntity.Node,
      upserted: NestedMutationEntity.Node,
    }, ["batched", "replacement", "upserted"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
