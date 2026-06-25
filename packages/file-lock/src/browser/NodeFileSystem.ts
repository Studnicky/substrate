import type { FileSystemInterface, StatResultInterface } from '@studnicky/virtual-fs';

import { VirtualFileSystem } from '@studnicky/virtual-fs';

const sharedInstance = VirtualFileSystem.create();

export class NodeFileSystem implements FileSystemInterface {
  existsSync(path: string): boolean {
    const result = sharedInstance.existsSync(path);
    return result;
  }

  mkdirSync(path: string, options?: { readonly 'recursive'?: boolean }): void {
    sharedInstance.mkdirSync(path, options);
  }

  readdirSync(path: string): string[] {
    const result = sharedInstance.readdirSync(path);
    return result;
  }

  readFileSync(path: string, encoding: 'utf8'): string {
    const result = sharedInstance.readFileSync(path, encoding);
    return result;
  }

  renameSync(oldPath: string, newPath: string): void {
    sharedInstance.renameSync(oldPath, newPath);
  }

  statSync(path: string): StatResultInterface {
    const result = sharedInstance.statSync(path);
    return result;
  }

  unlinkSync(path: string): void {
    sharedInstance.unlinkSync(path);
  }

  writeFileSync(path: string, data: string, encoding: 'utf8'): void {
    sharedInstance.writeFileSync(path, data, encoding);
  }
}
