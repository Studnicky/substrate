import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { NestedMutationEntity } from "./NestedMutationEntity.js";

/** Mutations applied through `getAll` and `getById` retrieval paths. */
export namespace DetachedGetterMutationsEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      all: NestedMutationEntity.Schema,
      byId: NestedMutationEntity.Schema,
    },
    required: ["all", "byId"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject({ type: "object" } as const, {
      all: NestedMutationEntity.Node,
      byId: NestedMutationEntity.Node,
    }, ["all", "byId"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
