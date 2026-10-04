export const BROWSER_SWAPS: readonly (readonly [string, string])[] = [
  ['packages/system/src/providers/SystemProvider', 'packages/system/src/providers/browser/SystemProvider'],
  ['packages/system/src/modules/GpuDetector', 'packages/system/src/modules/browser/GpuDetector'],
  ['packages/concurrency/src/file-lock/NodeFileSystem', 'packages/concurrency/src/file-lock/browser/NodeFileSystem'],
  ['packages/concurrency/src/file-lock/NodeOwnerLiveness', 'packages/concurrency/src/file-lock/browser/NodeOwnerLiveness'],
  ['packages/concurrency/src/file-lock/NodeOwnerToken', 'packages/concurrency/src/file-lock/browser/NodeOwnerToken'],
  ['packages/fetch/src/config/DispatcherAgent', 'packages/fetch/src/config/browser/DispatcherAgent'],
  ['packages/fetch/src/modules/FetchTransport', 'packages/fetch/src/modules/browser/FetchTransport'],
  ['packages/fetch/src/modules/UndiciDispatcher', 'packages/fetch/src/modules/browser/UndiciDispatcher']
];
