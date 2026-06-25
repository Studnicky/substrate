export interface StatResultInterface {
  isDirectory(): boolean;
  isFile(): boolean;
  readonly 'mtimeMs': number;
}
