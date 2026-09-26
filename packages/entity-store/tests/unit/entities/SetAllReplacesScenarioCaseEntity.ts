import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { UserEntity } from "./common/UserEntity.js";

/** The `set-all-replaces` scenario case shape `EntityStore.loop.spec.ts` exercises. */
export namespace SetAllReplacesScenarioCaseEntity {
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
          entity: UserEntity.Schema,
          ids: {
            items: {
              type: "string",
            },
            type: "array",
          },
          missing: {
            items: {
              type: "string",
            },
            type: "array",
          },
          size: {
            type: "number",
          },
        },
        required: ["entity", "ids", "missing", "size"],
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
        const: "set-all-replaces",
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
          entity: UserEntity.Node,
          ids: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            SchemaNode.defineString({
              type: "string",
            } as const),
          ),
          missing: SchemaNode.defineArray(
            {
              type: "array",
            } as const,
            SchemaNode.defineString({
              type: "string",
            } as const),
          ),
          size: SchemaNode.defineNumber({
            type: "number",
          } as const),
        },
        ["entity", "ids", "missing", "size"] as const,
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
      shape: SchemaNode.defineConst("set-all-replaces" as const),
    },
    ["description", "expected", "input", "name", "shape"] as const,
    { additionalProperties: false },
  );
  export type Type = NodeStaticType<typeof Node>;
}
