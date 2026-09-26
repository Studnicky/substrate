import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** Builds one `oneOf` branch's `Schema`/`Node` pair from a single call, so the two can never drift apart. */
function defineCase<
  const TShape extends string,
  TInputNode extends SchemaNodeInterface<unknown, unknown>,
  TExpectedNode extends SchemaNodeInterface<unknown, unknown>
>(shape: TShape, inputSchema: Record<string, unknown>, inputNode: TInputNode, expectedSchema: Record<string, unknown>, expectedNode: TExpectedNode) {
  const schema = {
    'additionalProperties': false,
    'properties': {
      'description': nonEmptyStringSchema,
      'expected': expectedSchema,
      'input': inputSchema,
      'name': nonEmptyStringSchema,
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  };
  const node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': NonEmptyStringNode,
      'expected': expectedNode,
      'input': inputNode,
      'name': NonEmptyStringNode,
      'shape': SchemaNode.defineConst(shape)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  return { node, schema };
}

const StringNode = SchemaNode.defineString({ 'type': 'string' } as const);
const stringSchema = { 'type': 'string' } as const;

const NumberNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
const numberSchema = { 'type': 'number' } as const;

const BooleanNode = SchemaNode.defineBoolean({ 'type': 'boolean' } as const);
const booleanSchema = { 'type': 'boolean' } as const;

const NonEmptyStringNode = SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const);
const nonEmptyStringSchema = { 'minLength': 1, 'type': 'string' } as const;

const StringArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, StringNode);
const stringArraySchema = { 'items': stringSchema, 'type': 'array' } as const;

const FileEntryNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'path': StringNode }, ['content', 'path'] as const, {
  'additionalProperties': false
});
const fileEntrySchema = {
  'additionalProperties': false,
  'properties': { 'content': stringSchema, 'path': stringSchema },
  'required': ['content', 'path'],
  'type': 'object'
} as const;

const FileEntryArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, FileEntryNode);
const fileEntryArraySchema = { 'items': fileEntrySchema, 'type': 'array' } as const;

const FromToEntryNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'from': StringNode, 'to': StringNode }, ['from', 'to'] as const, {
  'additionalProperties': false
});
const fromToEntrySchema = {
  'additionalProperties': false,
  'properties': { 'from': stringSchema, 'to': stringSchema },
  'required': ['from', 'to'],
  'type': 'object'
} as const;

const FromToEntryArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, FromToEntryNode);
const fromToEntryArraySchema = { 'items': fromToEntrySchema, 'type': 'array' } as const;

const ContentPathInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'path': StringNode }, ['content', 'path'] as const, {
  'additionalProperties': false
});
const contentPathInputSchema = {
  'additionalProperties': false,
  'properties': { 'content': stringSchema, 'path': stringSchema },
  'required': ['content', 'path'],
  'type': 'object'
} as const;

const FirstPathSecondInputNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'first': StringNode, 'path': StringNode, 'second': StringNode },
  ['first', 'path', 'second'] as const,
  { 'additionalProperties': false }
);
const firstPathSecondInputSchema = {
  'additionalProperties': false,
  'properties': { 'first': stringSchema, 'path': stringSchema, 'second': stringSchema },
  'required': ['first', 'path', 'second'],
  'type': 'object'
} as const;

const ContentFromToInputNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'content': StringNode, 'from': StringNode, 'to': StringNode },
  ['content', 'from', 'to'] as const,
  { 'additionalProperties': false }
);
const contentFromToInputSchema = {
  'additionalProperties': false,
  'properties': { 'content': stringSchema, 'from': stringSchema, 'to': stringSchema },
  'required': ['content', 'from', 'to'],
  'type': 'object'
} as const;

const HookNameWrittenExpectedNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'hookName': StringNode, 'written': BooleanNode },
  ['hookName', 'written'] as const,
  { 'additionalProperties': false }
);
const hookNameWrittenExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'hookName': stringSchema, 'written': booleanSchema },
  'required': ['hookName', 'written'],
  'type': 'object'
} as const;

const onCreateNewFiles = defineCase(
  'onCreate-new-files',
  { 'additionalProperties': false, 'properties': { 'files': fileEntryArraySchema }, 'required': ['files'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'files': FileEntryArrayNode }, ['files'] as const, { 'additionalProperties': false }),
  { 'additionalProperties': false, 'properties': { 'createLog': stringArraySchema }, 'required': ['createLog'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'createLog': StringArrayNode }, ['createLog'] as const, { 'additionalProperties': false })
);

const onCreateRecursiveMkdir = defineCase(
  'onCreate-recursive-mkdir',
  { 'additionalProperties': false, 'properties': { 'path': stringSchema }, 'required': ['path'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': StringNode }, ['path'] as const, { 'additionalProperties': false }),
  { 'additionalProperties': false, 'properties': { 'createLogIncludes': stringArraySchema }, 'required': ['createLogIncludes'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'createLogIncludes': StringArrayNode }, ['createLogIncludes'] as const, {
    'additionalProperties': false
  })
);

const onCreateNoOverwrite = defineCase(
  'onCreate-no-overwrite',
  firstPathSecondInputSchema,
  FirstPathSecondInputNode,
  { 'additionalProperties': false, 'properties': { 'createCount': numberSchema }, 'required': ['createCount'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'createCount': NumberNode }, ['createCount'] as const, { 'additionalProperties': false })
);

const onWriteUpdateOnly = defineCase(
  'onWrite-update-only',
  firstPathSecondInputSchema,
  FirstPathSecondInputNode,
  { 'additionalProperties': false, 'properties': { 'writeLog': stringArraySchema }, 'required': ['writeLog'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'writeLog': StringArrayNode }, ['writeLog'] as const, { 'additionalProperties': false })
);

const onReadReadFileSync = defineCase(
  'onRead-readFileSync',
  contentPathInputSchema,
  ContentPathInputNode,
  { 'additionalProperties': false, 'properties': { 'readLog': stringArraySchema }, 'required': ['readLog'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'readLog': StringArrayNode }, ['readLog'] as const, { 'additionalProperties': false })
);

const onReadReaddirSync = defineCase(
  'onRead-readdirSync',
  { 'additionalProperties': false, 'properties': { 'path': stringSchema }, 'required': ['path'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': StringNode }, ['path'] as const, { 'additionalProperties': false }),
  { 'additionalProperties': false, 'properties': { 'readLogIncludes': stringArraySchema }, 'required': ['readLogIncludes'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'readLogIncludes': StringArrayNode }, ['readLogIncludes'] as const, {
    'additionalProperties': false
  })
);

const onDeleteUnlinkSync = defineCase(
  'onDelete-unlinkSync',
  contentPathInputSchema,
  ContentPathInputNode,
  { 'additionalProperties': false, 'properties': { 'deleteLog': stringArraySchema }, 'required': ['deleteLog'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'deleteLog': StringArrayNode }, ['deleteLog'] as const, { 'additionalProperties': false })
);

const onDeleteNotBeforeUnlink = defineCase(
  'onDelete-not-before-unlink',
  contentPathInputSchema,
  ContentPathInputNode,
  { 'additionalProperties': false, 'properties': { 'deleteCount': numberSchema }, 'required': ['deleteCount'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'deleteCount': NumberNode }, ['deleteCount'] as const, { 'additionalProperties': false })
);

const onRenamePaths = defineCase(
  'onRename-paths',
  contentFromToInputSchema,
  ContentFromToInputNode,
  { 'additionalProperties': false, 'properties': { 'renameLog': fromToEntryArraySchema }, 'required': ['renameLog'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'renameLog': FromToEntryArrayNode }, ['renameLog'] as const, { 'additionalProperties': false })
);

const fullTrace = defineCase(
  'full-trace',
  {
    'additionalProperties': false,
    'properties': { 'contentA': stringSchema, 'contentB': stringSchema, 'path': stringSchema, 'renamed': stringSchema },
    'required': ['contentA', 'contentB', 'path', 'renamed'],
    'type': 'object'
  },
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'contentA': StringNode, 'contentB': StringNode, 'path': StringNode, 'renamed': StringNode },
    ['contentA', 'contentB', 'path', 'renamed'] as const,
    { 'additionalProperties': false }
  ),
  {
    'additionalProperties': false,
    'properties': {
      'createLog': stringArraySchema,
      'deleteLog': stringArraySchema,
      'readLog': stringArraySchema,
      'renameCount': numberSchema,
      'writeLog': stringArraySchema
    },
    'required': ['createLog', 'deleteLog', 'readLog', 'renameCount', 'writeLog'],
    'type': 'object'
  },
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'createLog': StringArrayNode,
      'deleteLog': StringArrayNode,
      'readLog': StringArrayNode,
      'renameCount': NumberNode,
      'writeLog': StringArrayNode
    },
    ['createLog', 'deleteLog', 'readLog', 'renameCount', 'writeLog'] as const,
    { 'additionalProperties': false }
  )
);

const subclassCreateInstance = defineCase(
  'subclass-create-instance',
  { 'additionalProperties': false, 'properties': { 'factory': stringSchema }, 'required': ['factory'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'factory': StringNode }, ['factory'] as const, { 'additionalProperties': false }),
  {
    'additionalProperties': false,
    'properties': { 'instanceofBase': booleanSchema, 'instanceofSubclass': booleanSchema },
    'required': ['instanceofBase', 'instanceofSubclass'],
    'type': 'object'
  },
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'instanceofBase': BooleanNode, 'instanceofSubclass': BooleanNode },
    ['instanceofBase', 'instanceofSubclass'] as const,
    { 'additionalProperties': false }
  )
);

const throwingCreateHook = defineCase('throwing-create-hook', contentPathInputSchema, ContentPathInputNode, hookNameWrittenExpectedSchema, HookNameWrittenExpectedNode);
const throwingWriteHook = defineCase(
  'throwing-write-hook',
  firstPathSecondInputSchema,
  FirstPathSecondInputNode,
  hookNameWrittenExpectedSchema,
  HookNameWrittenExpectedNode
);

const throwingReadHook = defineCase(
  'throwing-read-hook',
  contentPathInputSchema,
  ContentPathInputNode,
  { 'additionalProperties': false, 'properties': { 'hookName': stringSchema }, 'required': ['hookName'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'hookName': StringNode }, ['hookName'] as const, { 'additionalProperties': false })
);

const throwingRenameHook = defineCase(
  'throwing-rename-hook',
  contentFromToInputSchema,
  ContentFromToInputNode,
  {
    'additionalProperties': false,
    'properties': { 'hookName': stringSchema, 'newContent': stringSchema, 'oldExists': booleanSchema },
    'required': ['hookName', 'newContent', 'oldExists'],
    'type': 'object'
  },
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'hookName': StringNode, 'newContent': StringNode, 'oldExists': BooleanNode },
    ['hookName', 'newContent', 'oldExists'] as const,
    { 'additionalProperties': false }
  )
);

const throwingDeleteHook = defineCase(
  'throwing-delete-hook',
  contentPathInputSchema,
  ContentPathInputNode,
  {
    'additionalProperties': false,
    'properties': { 'exists': booleanSchema, 'hookName': stringSchema },
    'required': ['exists', 'hookName'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'exists': BooleanNode, 'hookName': StringNode }, ['exists', 'hookName'] as const, {
    'additionalProperties': false
  })
);

const hookCauseChains = defineCase(
  'hook-cause-chains',
  contentPathInputSchema,
  ContentPathInputNode,
  { 'additionalProperties': false, 'properties': { 'causeMatches': booleanSchema }, 'required': ['causeMatches'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'causeMatches': BooleanNode }, ['causeMatches'] as const, { 'additionalProperties': false })
);

const asyncCreateHook = defineCase(
  'async-create-hook',
  contentPathInputSchema,
  ContentPathInputNode,
  {
    'additionalProperties': false,
    'properties': { 'content': stringSchema, 'rejections': { 'items': {}, 'type': 'array' } },
    'required': ['content', 'rejections'],
    'type': 'object'
  },
  SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'content': StringNode, 'rejections': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({} as const)) },
    ['content', 'rejections'] as const,
    { 'additionalProperties': false }
  )
);

/** The `VirtualFileSystem.subclass.loop.spec.ts` scenario case shape. Eighteen shapes carry genuinely disjoint required fields, so each is its own `oneOf` branch rather than one shared permissive bag. */
export namespace VirtualFileSystemSubclassScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      onCreateNewFiles.schema, onCreateRecursiveMkdir.schema, onCreateNoOverwrite.schema, onWriteUpdateOnly.schema, onReadReadFileSync.schema,
      onReadReaddirSync.schema, onDeleteUnlinkSync.schema, onDeleteNotBeforeUnlink.schema, onRenamePaths.schema, fullTrace.schema,
      subclassCreateInstance.schema, throwingCreateHook.schema, throwingWriteHook.schema, throwingReadHook.schema, throwingRenameHook.schema,
      throwingDeleteHook.schema, hookCauseChains.schema, asyncCreateHook.schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    onCreateNewFiles.node, onCreateRecursiveMkdir.node, onCreateNoOverwrite.node, onWriteUpdateOnly.node, onReadReadFileSync.node, onReadReaddirSync.node,
    onDeleteUnlinkSync.node, onDeleteNotBeforeUnlink.node, onRenamePaths.node, fullTrace.node, subclassCreateInstance.node, throwingCreateHook.node,
    throwingWriteHook.node, throwingReadHook.node, throwingRenameHook.node, throwingDeleteHook.node, hookCauseChains.node, asyncCreateHook.node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
