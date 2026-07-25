export const BROWSER_SWAPS: ReadonlyArray<readonly [string, string]> = [
  ['packages/system/src/providers/SystemProvider', 'packages/system/src/providers/browser/SystemProvider'],
  ['packages/system/src/modules/GpuDetector', 'packages/system/src/modules/browser/GpuDetector'],
  ['packages/file-lock/src/NodeFileSystem', 'packages/file-lock/src/browser/NodeFileSystem'],
  ['packages/file-lock/src/NodeOwnerToken', 'packages/file-lock/src/browser/NodeOwnerToken'],
  ['packages/fetch/src/config/DispatcherAgent', 'packages/fetch/src/config/browser/DispatcherAgent'],
  ['packages/fetch/src/modules/FetchTransport', 'packages/fetch/src/modules/browser/FetchTransport'],
  ['packages/fetch/src/modules/UndiciDispatcher', 'packages/fetch/src/modules/browser/UndiciDispatcher']
];
