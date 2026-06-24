import { createEslintConfig } from '@studnicky/eslint-config';

export default [
  { ignores: ['.claude/**'] },
  ...createEslintConfig({ 'tsconfigRootDir': import.meta.dirname }),
  // ConsoleTransport is the only file in the codebase permitted to use `console`.
  // All other modules must route output through this transport.
  {
    'files': ['packages/logger/src/transports/ConsoleTransport.ts'],
    'rules': {
      'no-console': 'off'
    }
  }
];
