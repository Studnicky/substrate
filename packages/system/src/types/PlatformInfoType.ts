export type PlatformInfoType = {
  readonly isAppleSilicon: boolean;
  readonly nodeVersion: string;
  readonly os: 'darwin' | 'linux' | 'win32' | string;
};
