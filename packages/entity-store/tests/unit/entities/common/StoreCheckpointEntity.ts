import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

/** A point-in-time snapshot of store ids and size. */
export namespace StoreCheckpointEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      ids: {
        items: {
          type: "string",
        },
        type: "array",
      },
      size: {
        type: "number",
      },
    },
    required: ["ids", "size"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject({ type: "object" } as const, {
      ids: SchemaNode.defineArray({
          type: "array",
        } as const, SchemaNode.defineString({
          type: "string",
        } as const), undefined),
      size: SchemaNode.defineNumber({
        type: "number",
      } as const),
    }, ["ids", "size"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
