import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { UserEntity } from "./common/UserEntity.js";

/** The `hook-failures-isolated-per-instance` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace HookFailuresIsolatedPerInstanceScenarioCaseEntity {
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
          first: {
            additionalProperties: false,
            properties: {
              hookErrorCount: {
                type: "number",
              },
              message: {
                type: "string",
              },
            },
            required: ["hookErrorCount", "message"],
            type: "object",
          },
          hookName: {
            type: "string",
          },
          second: {
            additionalProperties: false,
            properties: {
              hookErrorCount: {
                type: "number",
              },
              message: {
                type: "string",
              },
            },
            required: ["hookErrorCount", "message"],
            type: "object",
          },
        },
        required: ["first", "hookName", "second"],
        type: "object",
      },
      input: {
        additionalProperties: false,
        properties: {
          failureMessagePrefix: {
            type: "string",
          },
          first: UserEntity.Schema,
          second: UserEntity.Schema,
        },
        required: ["failureMessagePrefix", "first", "second"],
        type: "object",
      },
      name: {
        minLength: 1,
        type: "string",
      },
      shape: {
        const: "hook-failures-isolated-per-instance",
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
          first: SchemaNode.defineObject(
            {
              type: "object",
            } as const,
            {
              hookErrorCount: SchemaNode.defineNumber({
                type: "number",
              } as const),
              message: SchemaNode.defineString({
                type: "string",
              } as const),
            },
            ["hookErrorCount", "message"] as const,
          ),
          hookName: SchemaNode.defineString({
            type: "string",
          } as const),
          second: SchemaNode.defineObject(
            {
              type: "object",
            } as const,
            {
              hookErrorCount: SchemaNode.defineNumber({
                type: "number",
              } as const),
              message: SchemaNode.defineString({
                type: "string",
              } as const),
            },
            ["hookErrorCount", "message"] as const,
          ),
        },
        ["first", "hookName", "second"] as const,
      ),
      input: SchemaNode.defineObject(
        {
          type: "object",
        } as const,
        {
          failureMessagePrefix: SchemaNode.defineString({
            type: "string",
          } as const),
          first: UserEntity.Node,
          second: UserEntity.Node,
        },
        ["failureMessagePrefix", "first", "second"] as const,
      ),
      name: SchemaNode.defineString({
        minLength: 1,
        type: "string",
      } as const),
      shape: SchemaNode.defineConst(
        "hook-failures-isolated-per-instance" as const,
      ),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
