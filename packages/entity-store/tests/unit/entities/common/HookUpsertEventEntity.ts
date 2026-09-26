import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { UserEntity } from "./UserEntity.js";

/** A recorded upsert hook event. */
export namespace HookUpsertEventEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      entity: UserEntity.Schema,
      event: {
        const: "upsert",
      },
      id: {
        type: "string",
      },
    },
    required: ["entity", "event", "id"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject({ type: "object" } as const, {
      entity: UserEntity.Node,
      event: SchemaNode.defineConst({}, "upsert" as const),
      id: SchemaNode.defineString({
        type: "string",
      } as const),
    }, ["entity", "event", "id"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
