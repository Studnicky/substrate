import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

/** A hook failure targeted at one entity id. */
export namespace SelectiveHookFailureEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      id: {
        type: "string",
      },
      message: {
        type: "string",
      },
    },
    required: ["id", "message"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject({ type: "object" } as const, {
      id: SchemaNode.defineString({
        type: "string",
      } as const),
      message: SchemaNode.defineString({
        type: "string",
      } as const),
    }, ["id", "message"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
