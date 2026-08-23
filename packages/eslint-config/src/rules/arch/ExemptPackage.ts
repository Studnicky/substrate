/** Matches a configured package name against repository and project-service filenames. */
export class ExemptPackage {
  public static matches(filename: string, exemptPackages: readonly string[]): boolean {
    const exemptPackageCount = exemptPackages.length;

    for (let index = 0; index < exemptPackageCount; index += 1) {
      const exempt = exemptPackages[index];

      if (exempt === undefined) {
        continue;
      }

      const directory = `${exempt.replace('@studnicky/', '')}/`;

      if (filename.startsWith(directory) || filename.includes(`/packages/${directory}`)) {
        return true;
      }
    }

    return false;
  }
}
