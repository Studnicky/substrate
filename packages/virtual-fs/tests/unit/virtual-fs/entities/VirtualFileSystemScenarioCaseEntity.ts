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
  const node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': NonEmptyStringNode,
      'expected': expectedNode,
      'input': inputNode,
      'name': NonEmptyStringNode,
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
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

const StringArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, StringNode, undefined);
const stringArraySchema = { 'items': stringSchema, 'type': 'array' } as const;

const FileEntryNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'path': StringNode }, ['content', 'path'] as const, {
  'additionalProperties': false, 'patternProperties': {} });
const fileEntrySchema = {
  'additionalProperties': false,
  'properties': { 'content': stringSchema, 'path': stringSchema },
  'required': ['content', 'path'],
  'type': 'object'
} as const;

const FileEntryArrayNode = SchemaNode.defineArray({ 'type': 'array' } as const, FileEntryNode, undefined);
const fileEntryArraySchema = { 'items': fileEntrySchema, 'type': 'array' } as const;

const TextFileInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'encoding': SchemaNode.defineConst({}, 'utf8' as const), 'path': StringNode }, ['content', 'encoding', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const textFileInputSchema = {
  'additionalProperties': false,
  'properties': { 'content': stringSchema, 'encoding': { 'const': 'utf8' }, 'path': stringSchema },
  'required': ['content', 'encoding', 'path'],
  'type': 'object'
} as const;

const PathOnlyNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': StringNode }, ['path'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const pathOnlySchema = { 'additionalProperties': false, 'properties': { 'path': stringSchema }, 'required': ['path'], 'type': 'object' } as const;

const FirstSecondInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'encoding': SchemaNode.defineConst({}, 'utf8' as const), 'firstContent': StringNode, 'path': StringNode, 'secondContent': StringNode }, ['encoding', 'firstContent', 'path', 'secondContent'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const firstSecondInputSchema = {
  'additionalProperties': false,
  'properties': { 'encoding': { 'const': 'utf8' }, 'firstContent': stringSchema, 'path': stringSchema, 'secondContent': stringSchema },
  'required': ['encoding', 'firstContent', 'path', 'secondContent'],
  'type': 'object'
} as const;

const ContentEncodingFromToInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'encoding': SchemaNode.defineConst({}, 'utf8' as const), 'from': StringNode, 'to': StringNode }, ['content', 'encoding', 'from', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const contentEncodingFromToInputSchema = {
  'additionalProperties': false,
  'properties': { 'content': stringSchema, 'encoding': { 'const': 'utf8' }, 'from': stringSchema, 'to': stringSchema },
  'required': ['content', 'encoding', 'from', 'to'],
  'type': 'object'
} as const;

const ContentExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode }, ['content'] as const, {
  'additionalProperties': false, 'patternProperties': {} });
const contentExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'content': stringSchema },
  'required': ['content'],
  'type': 'object'
} as const;

const ExistsExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'exists': BooleanNode }, ['exists'] as const, {
  'additionalProperties': false, 'patternProperties': {} });
const existsExpectedSchema = { 'additionalProperties': false, 'properties': { 'exists': booleanSchema }, 'required': ['exists'], 'type': 'object' } as const;

const ExistsPathsExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'exists': StringArrayNode }, ['exists'] as const, {
  'additionalProperties': false, 'patternProperties': {} });
const existsPathsExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'exists': stringArraySchema },
  'required': ['exists'],
  'type': 'object'
} as const;

const ErrorCodeExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorCode': StringNode }, ['errorCode'] as const, {
  'additionalProperties': false, 'patternProperties': {} });
const errorCodeExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'errorCode': stringSchema },
  'required': ['errorCode'],
  'type': 'object'
} as const;

const LogEntryExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'logEntry': StringNode }, ['logEntry'] as const, {
  'additionalProperties': false, 'patternProperties': {} });
const logEntryExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'logEntry': stringSchema },
  'required': ['logEntry'],
  'type': 'object'
} as const;

const EntriesExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'entries': StringArrayNode }, ['entries'] as const, {
  'additionalProperties': false, 'patternProperties': {} });
const entriesExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'entries': stringArraySchema },
  'required': ['entries'],
  'type': 'object'
} as const;

const IncludedExcludedExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'excludedEntries': StringArrayNode, 'includedEntries': StringArrayNode }, ['excludedEntries', 'includedEntries'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const includedExcludedExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'excludedEntries': stringArraySchema, 'includedEntries': stringArraySchema },
  'required': ['excludedEntries', 'includedEntries'],
  'type': 'object'
} as const;

const MtimeExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'mtimeMs': NumberNode }, ['mtimeMs'] as const, {
  'additionalProperties': false, 'patternProperties': {} });
const mtimeExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'mtimeMs': numberSchema },
  'required': ['mtimeMs'],
  'type': 'object'
} as const;

const IsFileOrDirectoryExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'isDirectory': BooleanNode, 'isFile': BooleanNode }, ['isDirectory', 'isFile'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const isFileOrDirectoryExpectedSchema = {
  'additionalProperties': false,
  'properties': { 'isDirectory': booleanSchema, 'isFile': booleanSchema },
  'required': ['isDirectory', 'isFile'],
  'type': 'object'
} as const;

const createClockDeterministic = defineCase(
  'create-clock-deterministic',
  {
    'additionalProperties': false,
    'properties': { 'clockMs': numberSchema, 'content': stringSchema, 'encoding': { 'const': 'utf8' }, 'path': stringSchema },
    'required': ['clockMs', 'content', 'encoding', 'path'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'clockMs': NumberNode, 'content': StringNode, 'encoding': SchemaNode.defineConst({}, 'utf8' as const), 'path': StringNode }, ['clockMs', 'content', 'encoding', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  mtimeExpectedSchema,
  MtimeExpectedNode
);

const createSeedEmpty = defineCase(
  'create-seed-empty',
  { 'additionalProperties': false, 'properties': { 'seed': fileEntryArraySchema }, 'required': ['seed'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'seed': FileEntryArrayNode }, ['seed'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  {
    'additionalProperties': false,
    'properties': { 'rootEntries': stringArraySchema, 'rootPath': stringSchema },
    'required': ['rootEntries', 'rootPath'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'rootEntries': StringArrayNode, 'rootPath': StringNode }, ['rootEntries', 'rootPath'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const createSeedPopulates = defineCase(
  'create-seed-populates',
  {
    'additionalProperties': false,
    'properties': { 'readPath': stringSchema, 'seed': fileEntryArraySchema },
    'required': ['readPath', 'seed'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'readPath': StringNode, 'seed': FileEntryArrayNode }, ['readPath', 'seed'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  contentExpectedSchema,
  ContentExpectedNode
);

const existsAfterWrite = defineCase('exists-after-write', textFileInputSchema, TextFileInputNode, existsExpectedSchema, ExistsExpectedNode);
const existsMissing = defineCase('exists-missing', pathOnlySchema, PathOnlyNode, existsExpectedSchema, ExistsExpectedNode);
const existsRoot = defineCase('exists-root', pathOnlySchema, PathOnlyNode, existsExpectedSchema, ExistsExpectedNode);

const lifecycleOnCreate = defineCase('lifecycle-onCreate', textFileInputSchema, TextFileInputNode, logEntryExpectedSchema, LogEntryExpectedNode);
const lifecycleOnDelete = defineCase('lifecycle-onDelete', textFileInputSchema, TextFileInputNode, logEntryExpectedSchema, LogEntryExpectedNode);
const lifecycleOnRead = defineCase('lifecycle-onRead', textFileInputSchema, TextFileInputNode, logEntryExpectedSchema, LogEntryExpectedNode);

const lifecycleOnRename = defineCase(
  'lifecycle-onRename',
  contentEncodingFromToInputSchema,
  ContentEncodingFromToInputNode,
  {
    'additionalProperties': false,
    'properties': {
      'logEntry': {
        'additionalProperties': false,
        'properties': { 'newPath': stringSchema, 'oldPath': stringSchema },
        'required': ['newPath', 'oldPath'],
        'type': 'object'
      }
    },
    'required': ['logEntry'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, {
      'logEntry': SchemaNode.defineObject({ 'type': 'object' } as const, { 'newPath': StringNode, 'oldPath': StringNode }, ['newPath', 'oldPath'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['logEntry'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const lifecycleOnWrite = defineCase('lifecycle-onWrite', firstSecondInputSchema, FirstSecondInputNode, logEntryExpectedSchema, LogEntryExpectedNode);

const mkdirExistingDirNoThrow = defineCase(
  'mkdir-existing-dir-no-throw',
  {
    'additionalProperties': false,
    'properties': { 'path': stringSchema, 'recursive': booleanSchema },
    'required': ['path', 'recursive'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': StringNode, 'recursive': BooleanNode }, ['path', 'recursive'] as const, {
    'additionalProperties': false, 'patternProperties': {} }),
  { 'additionalProperties': false, 'properties': { 'didThrow': booleanSchema }, 'required': ['didThrow'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'didThrow': BooleanNode }, ['didThrow'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const mkdirExistingDirThrows = defineCase(
  'mkdir-existing-dir-throws',
  {
    'additionalProperties': false,
    'properties': { 'existingRecursive': booleanSchema, 'path': stringSchema },
    'required': ['existingRecursive', 'path'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'existingRecursive': BooleanNode, 'path': StringNode }, ['existingRecursive', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  errorCodeExpectedSchema,
  ErrorCodeExpectedNode
);

const mkdirFilePathThrows = defineCase(
  'mkdir-file-path-throws',
  textFileInputSchema,
  TextFileInputNode,
  {
    'additionalProperties': false,
    'properties': { 'errorCode': stringSchema, 'fileContent': stringSchema, 'fileStillExists': booleanSchema },
    'required': ['errorCode', 'fileContent', 'fileStillExists'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorCode': StringNode, 'fileContent': StringNode, 'fileStillExists': BooleanNode }, ['errorCode', 'fileContent', 'fileStillExists'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const mkdirRecursiveCreates = defineCase(
  'mkdir-recursive-creates',
  {
    'additionalProperties': false,
    'properties': { 'path': stringSchema, 'recursive': booleanSchema },
    'required': ['path', 'recursive'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': StringNode, 'recursive': BooleanNode }, ['path', 'recursive'] as const, {
    'additionalProperties': false, 'patternProperties': {} }),
  existsPathsExpectedSchema,
  ExistsPathsExpectedNode
);

const mkdirRecursiveIntermediateFileThrows = defineCase(
  'mkdir-recursive-intermediate-file-throws',
  {
    'additionalProperties': false,
    'properties': { 'content': stringSchema, 'encoding': { 'const': 'utf8' }, 'intermediateFilePath': stringSchema, 'path': stringSchema },
    'required': ['content', 'encoding', 'intermediateFilePath', 'path'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'encoding': SchemaNode.defineConst({}, 'utf8' as const), 'intermediateFilePath': StringNode, 'path': StringNode }, ['content', 'encoding', 'intermediateFilePath', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  errorCodeExpectedSchema,
  ErrorCodeExpectedNode
);

const readMissingThrows = defineCase(
  'read-missing-throws',
  { 'additionalProperties': false, 'properties': { 'encoding': { 'const': 'utf8' }, 'path': stringSchema }, 'required': ['encoding', 'path'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'encoding': SchemaNode.defineConst({}, 'utf8' as const), 'path': StringNode }, ['encoding', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  errorCodeExpectedSchema,
  ErrorCodeExpectedNode
);

const readdirMissingThrows = defineCase('readdir-missing-throws', pathOnlySchema, PathOnlyNode, errorCodeExpectedSchema, ErrorCodeExpectedNode);

const readdirMixedOperations = defineCase(
  'readdir-mixed-operations',
  {
    'additionalProperties': false,
    'properties': {
      'childDirectory': stringSchema,
      'directory': stringSchema,
      'extraContent': stringSchema,
      'extraPath': stringSchema,
      'leafContent': stringSchema,
      'leafPath': stringSchema,
      'removedPath': stringSchema,
      'renamedDirectory': stringSchema,
      'rootFiles': fileEntryArraySchema
    },
    'required': [
      'childDirectory', 'directory', 'extraContent', 'extraPath', 'leafContent', 'leafPath', 'removedPath', 'renamedDirectory', 'rootFiles'
    ],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, {
      'childDirectory': StringNode,
      'directory': StringNode,
      'extraContent': StringNode,
      'extraPath': StringNode,
      'leafContent': StringNode,
      'leafPath': StringNode,
      'removedPath': StringNode,
      'renamedDirectory': StringNode,
      'rootFiles': FileEntryArrayNode
    }, ['childDirectory', 'directory', 'extraContent', 'extraPath', 'leafContent', 'leafPath', 'removedPath', 'renamedDirectory', 'rootFiles'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  {
    'additionalProperties': false,
    'properties': { 'childEntries': stringArraySchema, 'dirBEntries': stringArraySchema, 'rootEntries': stringArraySchema },
    'required': ['childEntries', 'dirBEntries', 'rootEntries'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'childEntries': StringArrayNode, 'dirBEntries': StringArrayNode, 'rootEntries': StringArrayNode }, ['childEntries', 'dirBEntries', 'rootEntries'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const readdirNoNested = defineCase(
  'readdir-no-nested',
  {
    'additionalProperties': false,
    'properties': { 'content': stringSchema, 'directory': stringSchema, 'filePath': stringSchema },
    'required': ['content', 'directory', 'filePath'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'directory': StringNode, 'filePath': StringNode }, ['content', 'directory', 'filePath'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  includedExcludedExpectedSchema,
  IncludedExcludedExpectedNode
);

const readdirReflectsDirRename = defineCase(
  'readdir-reflects-dir-rename',
  {
    'additionalProperties': false,
    'properties': {
      'directories': stringArraySchema,
      'files': fileEntryArraySchema,
      'from': stringSchema,
      'missingAfterRename': stringSchema,
      'movedSubDirectory': stringSchema,
      'to': stringSchema
    },
    'required': ['directories', 'files', 'from', 'missingAfterRename', 'movedSubDirectory', 'to'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, {
      'directories': StringArrayNode,
      'files': FileEntryArrayNode,
      'from': StringNode,
      'missingAfterRename': StringNode,
      'movedSubDirectory': StringNode,
      'to': StringNode
    }, ['directories', 'files', 'from', 'missingAfterRename', 'movedSubDirectory', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  {
    'additionalProperties': false,
    'properties': { 'movedEntries': stringArraySchema, 'movedSubEntries': stringArraySchema, 'rootEntries': stringArraySchema },
    'required': ['movedEntries', 'movedSubEntries', 'rootEntries'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'movedEntries': StringArrayNode, 'movedSubEntries': StringArrayNode, 'rootEntries': StringArrayNode }, ['movedEntries', 'movedSubEntries', 'rootEntries'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const readdirReflectsFileRename = defineCase(
  'readdir-reflects-file-rename',
  {
    'additionalProperties': false,
    'properties': { 'content': stringSchema, 'directory': stringSchema, 'from': stringSchema, 'to': stringSchema },
    'required': ['content', 'directory', 'from', 'to'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'directory': StringNode, 'from': StringNode, 'to': StringNode }, ['content', 'directory', 'from', 'to'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  includedExcludedExpectedSchema,
  IncludedExcludedExpectedNode
);

const readdirReflectsUnlink = defineCase(
  'readdir-reflects-unlink',
  {
    'additionalProperties': false,
    'properties': { 'keep': stringSchema, 'keepContent': stringSchema, 'removed': stringSchema, 'removedContent': stringSchema },
    'required': ['keep', 'keepContent', 'removed', 'removedContent'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'keep': StringNode, 'keepContent': StringNode, 'removed': StringNode, 'removedContent': StringNode }, ['keep', 'keepContent', 'removed', 'removedContent'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  includedExcludedExpectedSchema,
  IncludedExcludedExpectedNode
);

const readdirRoot = defineCase(
  'readdir-root',
  { 'additionalProperties': false, 'properties': { 'files': fileEntryArraySchema }, 'required': ['files'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'files': FileEntryArrayNode }, ['files'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  entriesExpectedSchema,
  EntriesExpectedNode
);

const readdirScaleScope = defineCase(
  'readdir-scale-scope',
  {
    'additionalProperties': false,
    'properties': { 'target': stringSchema, 'targetFile': stringSchema, 'unrelatedCount': numberSchema },
    'required': ['target', 'targetFile', 'unrelatedCount'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'target': StringNode, 'targetFile': StringNode, 'unrelatedCount': NumberNode }, ['target', 'targetFile', 'unrelatedCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  entriesExpectedSchema,
  EntriesExpectedNode
);

const renameDirectory = defineCase(
  'rename-directory',
  {
    'additionalProperties': false,
    'properties': { 'path': stringSchema, 'renamedPath': stringSchema },
    'required': ['path', 'renamedPath'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'path': StringNode, 'renamedPath': StringNode }, ['path', 'renamedPath'] as const, {
    'additionalProperties': false, 'patternProperties': {} }),
  {
    'additionalProperties': false,
    'properties': { 'sourceExists': booleanSchema, 'targetExists': booleanSchema, 'targetIsDirectory': booleanSchema },
    'required': ['sourceExists', 'targetExists', 'targetIsDirectory'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'sourceExists': BooleanNode, 'targetExists': BooleanNode, 'targetIsDirectory': BooleanNode }, ['sourceExists', 'targetExists', 'targetIsDirectory'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const renameDirectorySubtree = defineCase(
  'rename-directory-subtree',
  {
    'additionalProperties': false,
    'properties': {
      'childPath': stringSchema,
      'fileContent': stringSchema,
      'filePath': stringSchema,
      'movedFilePath': stringSchema,
      'movedNestedPath': stringSchema,
      'nestedContent': stringSchema,
      'nestedPath': stringSchema,
      'sourcePath': stringSchema,
      'targetPath': stringSchema
    },
    'required': [
      'childPath', 'fileContent', 'filePath', 'movedFilePath', 'movedNestedPath', 'nestedContent', 'nestedPath', 'sourcePath', 'targetPath'
    ],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, {
      'childPath': StringNode,
      'fileContent': StringNode,
      'filePath': StringNode,
      'movedFilePath': StringNode,
      'movedNestedPath': StringNode,
      'nestedContent': StringNode,
      'nestedPath': StringNode,
      'sourcePath': StringNode,
      'targetPath': StringNode
    }, ['childPath', 'fileContent', 'filePath', 'movedFilePath', 'movedNestedPath', 'nestedContent', 'nestedPath', 'sourcePath', 'targetPath'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  {
    'additionalProperties': false,
    'properties': { 'movedFileContent': stringSchema, 'movedNestedContent': stringSchema, 'sourceExists': booleanSchema },
    'required': ['movedFileContent', 'movedNestedContent', 'sourceExists'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'movedFileContent': StringNode, 'movedNestedContent': StringNode, 'sourceExists': BooleanNode }, ['movedFileContent', 'movedNestedContent', 'sourceExists'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const renameFileMovesContent = defineCase(
  'rename-file-moves-content',
  contentEncodingFromToInputSchema,
  ContentEncodingFromToInputNode,
  {
    'additionalProperties': false,
    'properties': { 'content': stringSchema, 'sourceExists': booleanSchema, 'targetExists': booleanSchema },
    'required': ['content', 'sourceExists', 'targetExists'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'content': StringNode, 'sourceExists': BooleanNode, 'targetExists': BooleanNode }, ['content', 'sourceExists', 'targetExists'] as const, { 'additionalProperties': false, 'patternProperties': {} })
);

const renameMissingThrows = defineCase(
  'rename-missing-throws',
  { 'additionalProperties': false, 'properties': { 'from': stringSchema, 'to': stringSchema }, 'required': ['from', 'to'], 'type': 'object' },
  SchemaNode.defineObject({ 'type': 'object' } as const, { 'from': StringNode, 'to': StringNode }, ['from', 'to'] as const, {
    'additionalProperties': false, 'patternProperties': {} }),
  errorCodeExpectedSchema,
  ErrorCodeExpectedNode
);

const statDirShape = defineCase('stat-dir-shape', pathOnlySchema, PathOnlyNode, isFileOrDirectoryExpectedSchema, IsFileOrDirectoryExpectedNode);
const statFileShape = defineCase('stat-file-shape', textFileInputSchema, TextFileInputNode, isFileOrDirectoryExpectedSchema, IsFileOrDirectoryExpectedNode);
const statMissingThrows = defineCase('stat-missing-throws', pathOnlySchema, PathOnlyNode, errorCodeExpectedSchema, ErrorCodeExpectedNode);

const statMtimeClock = defineCase(
  'stat-mtime-clock',
  {
    'additionalProperties': false,
    'properties': {
      'advanceMs': numberSchema,
      'content': stringSchema,
      'encoding': { 'const': 'utf8' },
      'initialClockMs': numberSchema,
      'path': stringSchema
    },
    'required': ['advanceMs', 'content', 'encoding', 'initialClockMs', 'path'],
    'type': 'object'
  },
  SchemaNode.defineObject({ 'type': 'object' } as const, {
      'advanceMs': NumberNode,
      'content': StringNode,
      'encoding': SchemaNode.defineConst({}, 'utf8' as const),
      'initialClockMs': NumberNode,
      'path': StringNode
    }, ['advanceMs', 'content', 'encoding', 'initialClockMs', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  mtimeExpectedSchema,
  MtimeExpectedNode
);

const unlinkDirectoryThrows = defineCase('unlink-directory-throws', pathOnlySchema, PathOnlyNode, errorCodeExpectedSchema, ErrorCodeExpectedNode);
const unlinkMissingThrows = defineCase('unlink-missing-throws', pathOnlySchema, PathOnlyNode, errorCodeExpectedSchema, ErrorCodeExpectedNode);
const unlinkRemoves = defineCase('unlink-removes', textFileInputSchema, TextFileInputNode, existsExpectedSchema, ExistsExpectedNode);

const writeOverwrite = defineCase('write-overwrite', firstSecondInputSchema, FirstSecondInputNode, contentExpectedSchema, ContentExpectedNode);
const writeRoundtrip = defineCase('write-roundtrip', textFileInputSchema, TextFileInputNode, contentExpectedSchema, ContentExpectedNode);

/** The `VirtualFileSystem.loop.spec.ts` scenario case shape. Thirty-eight shapes carry genuinely disjoint required fields, so each is its own `oneOf` branch rather than one shared permissive bag. */
export namespace VirtualFileSystemScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      createClockDeterministic.schema, createSeedEmpty.schema, createSeedPopulates.schema, existsAfterWrite.schema, existsMissing.schema, existsRoot.schema,
      lifecycleOnCreate.schema, lifecycleOnDelete.schema, lifecycleOnRead.schema, lifecycleOnRename.schema, lifecycleOnWrite.schema,
      mkdirExistingDirNoThrow.schema, mkdirExistingDirThrows.schema, mkdirFilePathThrows.schema, mkdirRecursiveCreates.schema,
      mkdirRecursiveIntermediateFileThrows.schema, readMissingThrows.schema, readdirMissingThrows.schema, readdirMixedOperations.schema,
      readdirNoNested.schema, readdirReflectsDirRename.schema, readdirReflectsFileRename.schema, readdirReflectsUnlink.schema, readdirRoot.schema,
      readdirScaleScope.schema, renameDirectory.schema, renameDirectorySubtree.schema, renameFileMovesContent.schema, renameMissingThrows.schema,
      statDirShape.schema, statFileShape.schema, statMissingThrows.schema, statMtimeClock.schema, unlinkDirectoryThrows.schema, unlinkMissingThrows.schema,
      unlinkRemoves.schema, writeOverwrite.schema, writeRoundtrip.schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    createClockDeterministic.node, createSeedEmpty.node, createSeedPopulates.node, existsAfterWrite.node, existsMissing.node, existsRoot.node,
    lifecycleOnCreate.node, lifecycleOnDelete.node, lifecycleOnRead.node, lifecycleOnRename.node, lifecycleOnWrite.node, mkdirExistingDirNoThrow.node,
    mkdirExistingDirThrows.node, mkdirFilePathThrows.node, mkdirRecursiveCreates.node, mkdirRecursiveIntermediateFileThrows.node, readMissingThrows.node,
    readdirMissingThrows.node, readdirMixedOperations.node, readdirNoNested.node, readdirReflectsDirRename.node, readdirReflectsFileRename.node,
    readdirReflectsUnlink.node, readdirRoot.node, readdirScaleScope.node, renameDirectory.node, renameDirectorySubtree.node, renameFileMovesContent.node,
    renameMissingThrows.node, statDirShape.node, statFileShape.node, statMissingThrows.node, statMtimeClock.node, unlinkDirectoryThrows.node,
    unlinkMissingThrows.node, unlinkRemoves.node, writeOverwrite.node, writeRoundtrip.node
  ] as const);
  export type Type = NodeStaticType<typeof Node>;
}
