import rootConfig from './eslint.config.ts';

/** Repository config for a package directory: tools that resolve the nearest config per package lint against the root rules and globs. */
export default rootConfig.map((config) => {
  const result = { ...config, 'basePath': '../..' };
  return result;
});
