import type { PlatformGroupInterface } from '../PlatformGroupInterface.js';

import { ANY, GLOBAL_OWNER } from './PlatformCallConstants.js';

/** Default platform APIs whose use throws or rejects with a native error unless guarded, grouped by owner and literal-argument policy. */

export const PLATFORM_GROUPS: readonly PlatformGroupInterface[] = [
  { 'kind': 'call', 'members': ['existsSync'], 'owners': ['fs'], 'safeWhenLiteral': 'always' },
  { 'kind': 'call', 'members': ['isIP', 'isIPv4', 'isIPv6'], 'owners': ['net'], 'safeWhenLiteral': 'always' },
  { 'kind': 'call', 'members': ['atob', 'btoa', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'fetch', 'structuredClone'], 'owners': [GLOBAL_OWNER], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['BigInt', 'RegExp'], 'owners': [GLOBAL_OWNER], 'safeWhenLiteral': 'firstArgument' },
  { 'kind': 'call', 'members': ['Array'], 'owners': [GLOBAL_OWNER], 'safeWhenLiteral': 'soleArgument' },
  { 'kind': 'call', 'members': ['from'], 'owners': ['ArrayConstructor'], 'safeWhenLiteral': 'firstArgumentLength' },
  { 'kind': 'call', 'members': ['fromCodePoint'], 'owners': ['StringConstructor'], 'safeWhenLiteral': 'everyArgument' },
  { 'kind': 'call', 'members': ['padEnd', 'padStart', 'repeat'], 'owners': ['String'], 'safeWhenLiteral': 'firstArgument' },
  { 'kind': 'call', 'members': ['arrayBuffer', 'blob', 'bytes', 'formData', 'json', 'text'], 'owners': ['Body'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['createObjectStore', 'deleteObjectStore', 'transaction'], 'owners': ['IDBDatabase'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['deleteDatabase', 'open'], 'owners': ['IDBFactory'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['add', 'clear', 'count', 'delete', 'get', 'getAll', 'openCursor', 'put'], 'owners': ['IDBObjectStore'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['objectStore'], 'owners': ['IDBTransaction'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['parse'], 'owners': ['JSON'], 'safeWhenLiteral': 'firstArgument' },
  { 'kind': 'call', 'members': ['stringify'], 'owners': ['JSON'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['postMessage'], 'owners': ['MessagePort', 'Worker'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['terminate'], 'owners': ['Worker'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['entries', 'getDirectoryHandle', 'getFileHandle', 'keys', 'removeEntry', 'resolve', 'values'], 'owners': ['FileSystemDirectoryHandle'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['createSyncAccessHandle', 'createWritable', 'getFile'], 'owners': ['FileSystemFileHandle'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['seek', 'truncate', 'write'], 'owners': ['FileSystemWritableFileStream'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['close'], 'owners': ['WritableStream'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['close', 'flush', 'getSize', 'read', 'truncate', 'write'], 'owners': ['FileSystemSyncAccessHandle'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['getDirectory'], 'owners': ['StorageManager'], 'safeWhenLiteral': 'never' },
  { 'kind': 'iterate', 'members': ['FileSystemDirectoryHandle'], 'owners': [ANY], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['clear', 'getItem', 'key', 'removeItem', 'setItem'], 'owners': ['Storage'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': [ANY], 'owners': ['SubtleCrypto'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': ['decode'], 'owners': ['TextDecoder'], 'safeWhenLiteral': 'never' },
  { 'kind': 'call', 'members': [ANY], 'owners': ['assert', 'assert/strict', 'child_process', 'fs', 'fs/promises', 'http', 'https', 'net', 'worker_threads', 'zlib'], 'safeWhenLiteral': 'never' },
  { 'kind': 'construct', 'members': ['SharedWorker', 'URL', 'Worker'], 'owners': [ANY], 'safeWhenLiteral': 'never' },
  { 'kind': 'construct', 'members': ['RegExp'], 'owners': [ANY], 'safeWhenLiteral': 'firstArgument' },
  { 'kind': 'construct', 'members': ['Array'], 'owners': [ANY], 'safeWhenLiteral': 'soleArgument' },
  { 'kind': 'read', 'members': ['localStorage', 'sessionStorage'], 'owners': [GLOBAL_OWNER], 'safeWhenLiteral': 'never' },
  { 'kind': 'read', 'members': ['localStorage'], 'owners': ['WindowLocalStorage'], 'safeWhenLiteral': 'never' },
  { 'kind': 'read', 'members': ['sessionStorage'], 'owners': ['WindowSessionStorage'], 'safeWhenLiteral': 'never' }
];
