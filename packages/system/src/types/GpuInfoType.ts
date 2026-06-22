export type GpuInfoType = {
  readonly computeApi: 'cuda' | 'metal' | 'opencl' | 'software';
  readonly name: string;
  readonly vramMb: number | null;
};
