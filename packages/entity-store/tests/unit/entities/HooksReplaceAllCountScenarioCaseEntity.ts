import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { HookEventEntity } from "./common/HookEventEntity.js";
import { UserEntity } from "./common/UserEntity.js";

/** The `hooks-replace-all-count` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HooksReplaceAllCountScenarioCaseEntity {
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
          replaceEvents: {
            items: HookEventEntity.Schema,
            type: "array",
          },
        },
        required: ["replaceEvents"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          initial: {
            items: UserEntity.Schema,
            type: "array",
          },
          next: {
            items: UserEntity.Schema,
            type: "array",
          },
        },
        required: ["initial", "next"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "hooks-replace-all-count",
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
          replaceEvents: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            HookEventEntity.Node,
          ),
        },
        ["replaceEvents"] as const,
      ),
      input: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          initial: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            UserEntity.Node,
          ),
          next: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            UserEntity.Node,
          ),
        },
        ["initial", "next"] as const,
      ),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst("hooks-replace-all-count" as const),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
