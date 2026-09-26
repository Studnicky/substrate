import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

/** A hook failure message fixture. */
export namespace HookFailureEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      message: {
        type: "string",
      },
    },
    required: ["message"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject(
    { type: "object" } as const,
    {
      message: SchemaNode.defineString({
        type: "string",
      } as const),
    },
    ["message"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
