/** Async file operations available in Node and browser OPFS adapters. */
export interface AsyncFileSystemInterface {
  'exists': (path: string) => Promise<boolean>;
  'mkdir': (path: string) => Promise<void>;
  'readdir': (path: string) => Promise<string[]>;
  'readFile': (path: string) => Promise<string>;
  'remove': (path: string) => Promise<void>;
  'writeFile': (path: string, data: string) => Promise<void>;
}
