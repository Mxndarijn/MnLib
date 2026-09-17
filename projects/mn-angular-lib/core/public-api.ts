/**
 * Public API of the `mn-angular-lib/core` entry point: config, context, language, preview, HTTP/CRUD services, shared types and icon helpers.
 *
 * Each entry point is its own module in the published package, so a consumer's bundler
 * splits it into the chunk that uses it instead of loading the whole library at startup.
 * The root `mn-angular-lib` entry re-exports every entry point.
 */
export * from './src/config';
export * from './src/context';
export * from './src/shared/crud';
export * from './src/shared/http';
export * from './src/shared/types';
export * from './src/shared/icons';
export * from './src/language';
export * from './src/preview';
