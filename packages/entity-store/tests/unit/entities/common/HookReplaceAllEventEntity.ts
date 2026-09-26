import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

/** A recorded replace-all hook event. */
export namespace HookReplaceAllEventEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      count: {
        type: "number",
      },
      event: {
        const: "replaceAll",
      },
    },
    required: ["count", "event"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject(
    { type: "object" } as const,
    {
      count: SchemaNode.defineNumber({
        type: "number",
      } as const),
      event: SchemaNode.defineConst("replaceAll" as const),
    },
    ["count", "event"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
