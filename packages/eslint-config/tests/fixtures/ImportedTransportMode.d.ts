export declare enum ImportedTransportMode {
  Cli = 'cli',
  Mcp = 'mcp'
}

export type ImportedTransportConfig = {
  'transport': 'cli' | 'mcp';
};

export interface ImportedReporterInterface {
  'notFound': (id: string) => void;
}
