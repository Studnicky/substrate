import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

/** A user record with a nested profile and role list, for deep-mutation scenario fixtures. */
export namespace NestedUserEntity {
  export const Schema = {
    additionalProperties: false,
    properties: {
      id: {
        type: "string",
      },
      profile: {
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
          },
        },
        required: ["name"],
        type: "object",
      },
      roles: {
        items: {
          type: "string",
        },
        type: "array",
      },
    },
    required: ["id", "profile", "roles"],
    type: "object",
  } as const;

  export const Node = SchemaNode.defineObject({ type: "object" } as const, {
      id: SchemaNode.defineString({
        type: "string",
      } as const),
      profile: SchemaNode.defineObject({
          type: "object",
        } as const, {
          name: SchemaNode.defineString({
            type: "string",
          } as const),
        }, ["name"] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      roles: SchemaNode.defineArray({
          type: "array",
        } as const, SchemaNode.defineString({
          type: "string",
        } as const), undefined),
    }, ["id", "profile", "roles"] as const, { additionalProperties: false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
