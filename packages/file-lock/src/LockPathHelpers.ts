export class LockPathHelpers {
  static dirname(path: string): string {
    const index = path.lastIndexOf('/');
    if (index === -1) { return '.'; }
    if (index === 0) { return '/'; }
    const result = path.slice(0, index);
    return result;
  }

  static basename(path: string): string {
    const index = path.lastIndexOf('/');
    const result = path.slice(index + 1);
    return result;
  }
}
