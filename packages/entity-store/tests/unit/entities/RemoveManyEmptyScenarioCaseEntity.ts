import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

/** The `remove-many-empty` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace RemoveManyEmptyScenarioCaseEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      description: {
        minLength: 1,
        type: "string",
      },
      expected: {
        additionalProperties: false,
        properties: {
          removed: {
            type: "number",
          },
        },
        required: ["removed"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          ids: {
            items: {
              type: "string",
            },
            type: "array",
          },
        },
        required: ["ids"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "remove-many-empty",
      },
    },
    required: ["description", "expected", "input", "name", "shape"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject(
    { type: "object" } as const,
    {
      description: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      expected: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          removed: SchemaNode.defineNumber({
            type: "number",
          } as const),
        },
        ["removed"] as const,
      ),
      input: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          ids: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            SchemaNode.defineString({
              type: "string",
            } as const),
          ),
        },
        ["ids"] as const,
      ),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst("remove-many-empty" as const),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
