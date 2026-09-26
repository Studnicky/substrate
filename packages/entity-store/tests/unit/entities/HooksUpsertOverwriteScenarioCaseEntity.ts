import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { HookEventEntity } from "./common/HookEventEntity.js";
import { UserEntity } from "./common/UserEntity.js";

/** The `hooks-upsert-overwrite` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HooksUpsertOverwriteScenarioCaseEntity {
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
          events: {
            items: HookEventEntity.Schema,
            type: "array",
          },
        },
        required: ["events"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          entities: {
            items: UserEntity.Schema,
            type: "array",
          },
        },
        required: ["entities"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "hooks-upsert-overwrite",
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
          events: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            HookEventEntity.Node,
          ),
        },
        ["events"] as const,
      ),
      input: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          entities: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            UserEntity.Node,
          ),
        },
        ["entities"] as const,
      ),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst("hooks-upsert-overwrite" as const),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
