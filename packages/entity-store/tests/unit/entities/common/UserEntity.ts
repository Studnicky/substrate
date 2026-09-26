import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

/** A minimal user record shared across `EntityStore.loop.spec.ts` scenario fixtures. */
export namespace UserEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      id: {
        type: "string",
      },
      name: {
        type: "string",
      },
    },
    required: ["id", "name"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject(
    { type: "object" } as const,
    {
      id: SchemaNode.defineString({
        type: "string",
      } as const),
      name: SchemaNode.defineString({
        type: "string",
      } as const),
    },
    ["id", "name"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
