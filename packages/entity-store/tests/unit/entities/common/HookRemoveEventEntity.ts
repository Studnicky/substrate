import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

/** A recorded remove hook event. */
export namespace HookRemoveEventEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      event: {
        const: "remove",
      },
      id: {
        type: "string",
      },
    },
    required: ["event", "id"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject(
    { type: "object" } as const,
    {
      event: SchemaNode.defineConst("remove" as const),
      id: SchemaNode.defineString({
        type: "string",
      } as const),
    },
    ["event", "id"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
